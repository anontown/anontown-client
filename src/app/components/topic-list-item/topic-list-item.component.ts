import {
  Component,
  OnInit,
  Input,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { Topic } from 'anontown';
import { UserService, IUserDataListener } from '../../services';

@Component({
  selector: 'app-topic-list-item',
  templateUrl: './topic-list-item.component.html',
  styleUrls: ['./topic-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopicListItemComponent implements OnInit, OnDestroy {
  @Input()
  topic: Topic;

  constructor(private user: UserService,
    private cdr: ChangeDetectorRef) {

  }

  private udListener: IUserDataListener;
  newRes: number;

  ngOnInit() {
    this.udListener = this.user.addUserDataListener(() => {
      let ud = this.user.ud;
      if (ud && ud.storage.topicRead.has(this.topic.id)) {
        this.newRes = this.topic.resCount - ud.storage.topicRead.get(this.topic.id).count;
      } else {
        this.newRes = null;
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.user.removeUserDataListener(this.udListener);
  }
}