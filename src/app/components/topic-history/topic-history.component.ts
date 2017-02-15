import {
    Component,
    Input,
    OnInit,
    OnDestroy,
    ChangeDetectionStrategy
} from '@angular/core';
import { AtApiService, Topic, Res, History } from 'anontown';
import {
    UserService
} from '../../services';
import * as Immutable from 'immutable';
import {MdSnackBar} from '@angular/material';

@Component({
    selector: 'app-topic-history',
    templateUrl: './topic-history.component.html',
    changeDetection: ChangeDetectionStrategy.Default
})
export class TopicHistoryComponent implements OnInit, OnDestroy {
    @Input()
    topic: Topic;

    @Input()
    history: History;

    private hashReses = Immutable.List<Res>();

    private isDetail = false;

    detail() {
        this.isDetail = !this.isDetail;
    }

    constructor(private api: AtApiService,
        public user: UserService,
        public snackBar: MdSnackBar) {

    }

    ngOnInit() {
    }

    ngOnDestroy() {
    }

    updateRes(res: Res) {
        this.hashReses.set(this.hashReses.findIndex((r) => r.id === res.id), res);
    }

    async hashClick() {
        let ud=this.user.ud.getValue();
        try{
            if (this.hashReses.size !== 0) {
                this.hashReses = Immutable.List<Res>();
            } else {
                this.hashReses = Immutable.List(await this.api.findResHash(ud.auth, {
                    topic: this.topic.id,
                    hash: this.history.hash
                }));

            }
        }catch(_e){
        this.snackBar.open("レス取得に失敗");
        }
    }
}