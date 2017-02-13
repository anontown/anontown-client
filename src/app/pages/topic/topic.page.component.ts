import {
  Component,
  OnInit,
  ViewChildren,
  QueryList,
  OnDestroy,
  NgZone,
  AfterViewChecked,
  ChangeDetectionStrategy
} from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import * as socketio from 'socket.io-client';
import { MdDialog } from '@angular/material';
import {
  Topic,
  AtApiService,
  Res,
} from 'anontown';
import { Config } from '../../config';
import { UserService, IUserDataListener } from '../../services';
import {
  TopicAutoScrollMenuDialogComponent,
  ResWriteDialogComponent
} from '../../dialogs';
import { ActivatedRoute,Router } from '@angular/router';
import { ResComponent } from '../../components';
import * as Immutable from 'immutable';
import { MdSnackBar } from '@angular/material';

@Component({
  templateUrl: './topic.page.component.html',
  styleUrls: ['./topic.page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class TopicPageComponent implements OnInit, OnDestroy, AfterViewChecked {
  topic: Topic;

  @ViewChildren('resE') resE: QueryList<ResComponent>;

  private reses = Immutable.List<Res>();
  private limit = 50;

  constructor(
    private user: UserService,
    private api: AtApiService,
    private route: ActivatedRoute,
    private zone: NgZone,
    private dialog: MdDialog,
    public snackBar: MdSnackBar,
    private router:Router) {
  }

  private isIOS=navigator.userAgent.match(/iPhone|iPad/);

  private intervalID: any;

  //他のレスを取得している間はロック
  private isLock = false;
  private async lock(call: () => Promise<void>) {
    if (this.isLock) {
      return;
    }
    this.isLock = true;
    try {
      await call();
    } catch (e) {
      this.isLock = false;
      throw e;
    }
    //レス数が変わっているはずなので更新
    try {
      this.topic = await this.api.findTopicOne({ id: this.topic.id });
    } catch (_e) {
      this.snackBar.open("トピック取得に失敗");
    }
    this.isLock = false;
  }

  updateRes(res: Res) {
    this.reses = this.reses.set(this.reses.findIndex((r) => r.id === res.id), res);
  }

  autoScrollSpeed = 10;
  private isAutoScroll = false;
  autoScroll() {
    this.isAutoScroll = !this.isAutoScroll;
  }
  async autoScrollMenu() {
    let dialog = this.dialog.open(TopicAutoScrollMenuDialogComponent);
    let con = dialog.componentInstance;
    con.autoScrollSpeed = this.autoScrollSpeed;
    con.isAutoScroll = this.isAutoScroll;
    await dialog.afterClosed().toPromise();
    this.autoScrollSpeed = con.autoScrollSpeed;
    this.isAutoScroll = con.isAutoScroll;
  }

  writeMenu() {
    if(!this.isIOS){
      let dialog = this.dialog.open(ResWriteDialogComponent);
      let com = dialog.componentInstance;
      com.topic = this.topic;
      com.reply = null;
    }else{
      this.router.navigate(['topic',this.topic.id,'write']);
    }
  }

  update(topic: Topic) {
    this.topic = topic;
  }


  private socket: SocketIOClient.Socket;

  //次のビュー更新で最新レスを読み込むか
  private isReadNew = false;
  ngAfterViewChecked() {
    if (this.isReadNew) {
      this.readNew();
      this.isReadNew = false;
    }
  }

  private udListener: IUserDataListener;

  ngOnDestroy() {
    this.scrollSave();
    this.scrollObs.unsubscribe();
    clearInterval(this.intervalID);
    this.socket.close();
    this.user.removeUserDataListener(this.udListener);
  }

  async ngOnInit() {
    let id: string = "";
    this.route.params.forEach((params) => {
      id = params["id"];
    });

    try {
      this.topic = await this.api.findTopicOne({ id });
      document.title = this.topic.title;
    } catch (_e) {
      this.snackBar.open("トピック取得に失敗");
    }

    let isInit = false;
    this.udListener = this.user.addUserDataListener(async () => {
      let ud = this.user.ud;
      if (isInit) {
        return;
      }
      isInit = true;
      if (ud !== null && ud.storage.topicRead.has(this.topic.id)) {
        //読んだことあるなら続きから
        try {
          await this.lock(async () => {
            this.reses = Immutable.List(await this.api.findRes(ud.auth,
              {
                topic: this.topic.id,
                type: "before",
                equal: true,
                date: (await this.api.findResOne(ud.auth, { id: (ud.storage.topicRead.get(this.topic.id).res) })).date,
                limit: this.limit
              }));
          });
        } catch (_e) {
          this.snackBar.open("レス取得に失敗");
        }
        this.isReadNew = true;
      } else {
        //読んだことないなら最新レス
        try {
          await this.findNew();
        } catch (_e) {
          this.snackBar.open("レス取得に失敗");
        }
      }
    });

    this.zone.runOutsideAngular(() => {
      this.intervalID = setInterval(() => {
        if (this.isAutoScroll) {
          document.body.scrollTop -= this.autoScrollSpeed;
        }
      }, 200);

      this.scrollObs = Observable.fromEvent(document.body, "scroll")
        .throttleTime(1000)
        .subscribe(() => {
          this.scrollSave();
        });
    });

    //自動更新
    this.socket = socketio.connect(Config.serverURL, { forceNew: true });
    this.socket.emit("topic-join", this.topic.id);
    this.socket.on("topic", (msg: string) => {
      if (msg === this.topic.id) {
        this.readNew();
      }
    });
  }

  private scrollSave(){
      if (this.user.ud) {
        //最短距離のレスID
        var res: Res;
        {
          let getTop = (rc: ResComponent) => rc.elementRef.nativeElement.getBoundingClientRect().top;
          //最短
          let rc: ResComponent | null = null;
          this.resE.forEach(x => {
            if (rc === null) {
              rc = x;
            } else if (Math.abs(getTop(rc)) > Math.abs(getTop(x))) {
              rc = x;
            }
          });
          if (rc === null) {
            return;
          }
          res = (rc as ResComponent).res;
        }

        //セット
        let storage = this.user.ud.storage;
        storage.topicRead = storage.topicRead.set(this.topic.id, {
          res: res.id,
          count: this.topic.resCount
        })
        this.user.updateUserData();
      }
    }

  private scrollObs: Subscription;

  private async findNew() {
    try {
      await this.lock(async () => {
        this.reses = Immutable.List(await this.api.findResNew(this.user.ud ? this.user.ud.auth : null,
          {
            topic: this.topic.id,
            limit: this.limit
          }));
      });
    } catch (_e) {
      this.snackBar.open("レス取得に失敗");
    }
  }

  async readNew() {
    try {
      if (this.reses.size === 0) {
        this.findNew();
      } else {
        await this.lock(async () => {
          //一番上のレスと座標を取得
          let rc = this.resE.first;
          let rcY: number;
          if (rc && rc.elementRef) {
            rcY = rc.elementRef.nativeElement.getBoundingClientRect().top as number;
          }

          this.reses = Immutable.List((await this.api.findRes(this.user.ud ? this.user.ud.auth : null,
            {
              topic: this.topic.id,
              type: "after",
              equal: false,
              date: this.reses.first().date,
              limit: this.limit
            }
          )).concat(this.reses.toArray()));

          if (rc && rc.elementRef) {
            setTimeout(() => {
              document.body.scrollTop += rc.elementRef.nativeElement.getBoundingClientRect().top - rcY
            }, 0);
          }
        });
      }
    } catch (_e) {
      this.snackBar.open("レス取得に失敗");
    }
  }

  async readOld() {
    try {
      if (this.reses.size === 0) {
        this.findNew();
      } else {
        await this.lock(async () => {
          this.reses = Immutable.List(this.reses.toArray().concat(await this.api.findRes(this.user.ud ? this.user.ud.auth : null,
            {
              topic: this.topic.id,
              type: "before",
              equal: false,
              date: this.reses.last().date,
              limit: this.limit
            }
          )));
        });
      }
    } catch (_e) {
      this.snackBar.open("レス取得に失敗");
    }
  }

  favo() {
    let storage = this.user.ud.storage;
    let tf = storage.topicFavo;
    storage.topicFavo = tf.has(this.topic.id) ? tf.delete(this.topic.id) : tf.add(this.topic.id);
    this.user.updateUserData();
  }
}