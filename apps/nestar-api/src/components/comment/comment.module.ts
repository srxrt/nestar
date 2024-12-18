import { Module } from '@nestjs/common';
import { CommentResolver } from './comment.resolver';
import { CommentService } from './comment.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { ViewModule } from '../view/view.module';
import CommentSchema from '../../schemas/Comment.model';
import { PropertyModule } from '../property/property.module';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Comment', schema: CommentSchema }]),
		AuthModule,
		PropertyModule,
		MemberModule,
	],
	providers: [CommentResolver, CommentService],
})
export class CommentModule {}
