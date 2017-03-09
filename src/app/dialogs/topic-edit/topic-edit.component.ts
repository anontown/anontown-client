import {
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectionStrategy,
} from '@angular/core';

import {
    AtApiService,
    Topic,
    AtError,
    IAtError
} from 'anontown';
import { UserService } from '../../services';

import { MdSnackBar, MdDialogRef } from '@angular/material';

@Component({
    templateUrl: './topic-edit.component.html',
    changeDetection: ChangeDetectionStrategy.Default
})
export class TopicEditDialogComponent implements OnInit, OnDestroy {
    topic: Topic;

    private title = "";
    private tags = "";
    private text = "";
    private errors: IAtError[] = [];

    constructor(private user: UserService,
        private api: AtApiService,
        public snackBar: MdSnackBar,
        private dialogRef: MdDialogRef<TopicEditDialogComponent>) {
    }

    ngOnInit() {
        this.title = this.topic.title;
        this.tags = this.topic.tags.join(" ");
        this.text = this.topic.text;
    }

    ngOnDestroy() {
    }

    async ok() {
        let ud = this.user.ud.getValue();
        try {
            let topic = await this.api.updateTopic(ud.auth, {
                id: this.topic.id,
                title: this.title,
                tags: this.tags.length === 0 ? [] : this.tags.split(/[\s　\,]+/),
                text: this.text
            });
            this.errors = [];
            this.dialogRef.close(topic);
        } catch (e) {
            if (e instanceof AtError) {
                this.errors = e.errors;
            } else {
                throw e;
            }
        }
    }
} 