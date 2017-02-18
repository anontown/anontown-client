import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  Input
} from '@angular/core';
import { UserService, } from '../../services';

import { Router } from '@angular/router';
import { Topic, AtApiService } from 'anontown';
import { MdSnackBar } from '@angular/material';
import * as Immutable from 'immutable';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-topic-favo',
  templateUrl: './topic-favo.component.html',
  styleUrls: ['./topic-favo.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class TopicFavoComponent implements OnInit, OnDestroy {

  @Input()
  simple = false;

  constructor(private user: UserService,
    private router: Router,
    private api: AtApiService,
    public snackBar: MdSnackBar) {
  }

  tfavo: Immutable.List<Topic>;
  private subscription: Subscription;

  ngOnInit() {
    this.subscription = this.user.ud.subscribe(async (ud) => {
      if (ud !== null) {
        await this.update();
      } else {
        this.tfavo = null;
      }
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  linkClick(id: number) {
    this.router.navigate(['/topic', id])
  }

  private async update() {
    let ud = this.user.ud.getValue();
    try {
      this.tfavo = Immutable.List(await this.api.findTopicIn({ ids: ud.storage.topicFavo.toArray() }))
        .sort((a, b) => a.update > b.update ? -1 : a.update < b.update ? 1 : 0).toList();
    } catch (_e) {
      this.snackBar.open("トピック取得に失敗");
    }
  }
}