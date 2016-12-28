import { Component, OnInit } from '@angular/core';
import {
    Res,
    AtApiService,
} from 'anontown';
import { UserDataService } from '../services';

@Component({
    selector: 'at-user-notice',
    templateUrl: './user-notice.component.html'
})
export class UserNoticeComponent implements OnInit {
    private reses: Res[] = [];
    private limit = 50;

    constructor(
        private ud: UserDataService,
        private api: AtApiService) {
    }

    ngOnInit() {
        this.findNew();
    }

    updateRes(res: Res) {
        this.reses[this.reses.findIndex((r) => r.id === res.id)] = res;
    }

    private async findNew() {
        this.reses = await this.api.findResNoticeNew(await this.ud.auth, {
            limit: this.limit
        })
    }

    async readNew() {
        if (this.reses.length === 0) {
            this.findNew();
        } else {
            this.reses = (await this.api.findResNotice(await this.ud.auth,
                {
                    type: "after",
                    equal: false,
                    date: this.reses[0].date,
                    limit: this.limit
                })).concat(this.reses);
        }
    }

    async readOld() {
        if (this.reses.length === 0) {
            this.findNew();
        } else {
            this.reses = this.reses.concat(await this.api.findResNotice(await this.ud.auth,
                {
                    type: "before",
                    equal: false,
                    date: this.reses[this.reses.length - 1].date,
                    limit: this.limit
                }));
        }
    }
}