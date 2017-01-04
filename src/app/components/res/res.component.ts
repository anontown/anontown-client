import {
  Component,
  Input,
  ElementRef,
  OnInit,
  EventEmitter,
  Output,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy
} from '@angular/core';

import * as Immutable from 'immutable';


import {
  AtApiService,
  Res,
} from 'anontown';


import { UserService, IUserDataListener, IUserData } from '../../services';
import { MdDialog } from '@angular/material';

import { ProfileComponent, ResWriteComponent, ButtonDialogComponent } from '../../dialogs';

@Component({
  selector: 'app-res',
  templateUrl: './res.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./res.component.scss']
})
export class ResComponent implements OnInit, OnDestroy {
  @Input()
  res: Res;

  children = Immutable.List<Res>();

  @Input()
  isPop: boolean = false;

  @Output()
  update = new EventEmitter<Res>();

  isSelf: boolean;

  constructor(private user: UserService,
    private api: AtApiService,
    private dialog: MdDialog,
    public elementRef: ElementRef,
    private cdr: ChangeDetectorRef) {
  }

  ud: IUserData;
  private udListener: IUserDataListener;


  ngOnInit() {
    this.udListener = this.user.addUserDataListener(data => {
      this.ud = data;
      if (data !== null) {
        this.isSelf = data.token.user === this.res.user;
      } else {
        this.isSelf = false;
      }
      this.cdr.markForCheck();
    });

  }

  ngOnDestroy() {
    this.user.removeUserDataListener(this.udListener);
  }

  childrenUpdate(res: Res) {
    this.children.set(this.children.findIndex((r) => r.id === res.id), res);
    this.cdr.markForCheck();
  }


  reply() {
    let dialog = this.dialog.open(ResWriteComponent);
    let com = dialog.componentInstance;
    com.topic = this.res.topic;
    com.reply = this.res;
    com.write.subscribe(() => {
      dialog.close();
    });
  }

  async hashClick() {
    if (this.children.size !== 0) {
      this.children = Immutable.List<Res>();
    } else {
      this.children = Immutable.List(await this.api.findResHash(this.ud !== null ? this.ud.auth : null, {
        topic: this.res.topic,
        hash: this.res.hash
      }));
    }
    this.cdr.markForCheck();
  }

  async sendReplyClick() {
    if (this.children.size !== 0) {
      this.children = Immutable.List<Res>();
    } else {
      this.children = Immutable.List([await this.api.findResOne(this.ud !== null ? this.ud.auth : null, {
        id: this.res.reply as string
      })]);
    }
    this.cdr.markForCheck();
  }

  async receiveReplyClick() {
    if (this.children.size !== 0) {
      this.children = Immutable.List<Res>();
    } else {
      this.children = Immutable.List(await this.api.findResReply(this.ud !== null ? this.ud.auth : null, {
        topic: this.res.topic,
        reply: this.res.id
      }));
    }
    this.cdr.markForCheck();
  }

  async uv() {
    this.update.emit(await this.api.uvRes(this.ud.auth, {
      id: this.res.id
    }));
  }

  async dv() {
    let dialogRef = this.dialog.open(ButtonDialogComponent);
    let com = dialogRef.componentInstance;
    com.message = "低評価して良いですか？";
    com.actions = [{ data: true, text: "はい" }, { data: false, text: "いいえ" }];

    let result: boolean = await dialogRef.afterClosed().toPromise();
    if (result) {
      this.update.emit(await this.api.dvRes(this.ud.auth, {
        id: this.res.id
      }));
    }
  }

  async del() {
    let dialogRef = this.dialog.open(ButtonDialogComponent);
    let com = dialogRef.componentInstance;
    com.message = "削除して良いですか？";
    com.actions = [{ data: true, text: "はい" }, { data: false, text: "いいえ" }];

    let result: boolean = await dialogRef.afterClosed().toPromise();

    if (result) {
      this.update.emit(await this.api.delRes(this.ud.auth, {
        id: this.res.id
      }));
    }
  }

  async profileOpen() {
    this.dialog.open(ProfileComponent).componentInstance.profile = await this.api.findProfileOne(this.ud ? this.ud.auth : null, {
      id: this.res.profile as string
    });
  }
}