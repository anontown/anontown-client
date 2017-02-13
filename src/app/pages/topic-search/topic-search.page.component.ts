import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import {
  Topic,
  AtApiService
} from 'anontown';
import { Subject } from 'rxjs';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import * as Immutable from 'immutable';
import {
  UserService
} from '../../services';
import { MdSnackBar } from '@angular/material';

@Component({
  templateUrl: './topic-search.page.component.html',
  styleUrls: ['./topic-search.page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class TopicSearchPageComponent implements OnInit, OnDestroy {
  // 検索結果
  private topics = Immutable.List<Topic>();
  private count = 0;

  // 現在の検索条件
  private tags = '';
  private title = '';
  private page = 0;
  private dead = false;

  // 設定
  private readonly limit = 100;

  // フォームデータ
  form = {
    tags: '',
    title: '',
    dead: false
  };

  constructor(private api: AtApiService,
    private route: ActivatedRoute,
    private router: Router,
    private user: UserService,
    public snackBar: MdSnackBar) {

  }

  // フォーム変更イベント
  formChangeObs = new Subject<void>();

  async update() {
    this.topics = Immutable.List<Topic>();
    this.page = 0;
    this.count = 0;
    await this.more();
  }

  private get tagArray(): string[] {
    return this.tags.length === 0 ? [] : this.tags.split(/[\s　\,]+/);
  }

  async more() {
    try {
      let t = await this.api.findTopic({
        title: this.title,
        tags: this.tagArray,
        skip: this.page * this.limit,
        limit: this.limit,
        activeOnly: !this.dead
      });
      this.count = t.length;
      this.topics = Immutable.List(this.topics.toArray().concat(t));
      this.page++;
    } catch (_e) {
      this.snackBar.open("トピック取得に失敗");
    }
  }


  ngOnInit() {
    this.formChangeObs
      .debounceTime(500)
      .subscribe(() => {
        this.router.navigate(['/topic/search'], { queryParams: { title: this.form.title, tags: this.form.tags, dead: this.form.dead } });
      });

    this.route.queryParams.forEach(async (params) => {
      document.title = "検索";
      this.form.title = this.title = params['title'] ? params['title'] : '';
      this.form.tags = this.tags = params['tags'] ? params['tags'] : '';
      this.form.dead = this.dead = params['dead'] === "true";
      await this.update();
    });
  }

  ngOnDestroy() {
  }

  favo() {
    let storage = this.user.ud.storage;
    let tf = storage.tagsFavo;
    let tags = Immutable.Set(this.tagArray);
    storage.tagsFavo = tf.has(tags) ? tf.delete(tags) : tf.add(tags);
    this.user.updateUserData();
  }

  get isFavo(): boolean {
    return this.user.ud.storage.tagsFavo.has(Immutable.Set(this.tagArray));
  }
}