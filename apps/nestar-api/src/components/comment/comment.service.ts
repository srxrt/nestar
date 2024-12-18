import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Comment } from '../../libs/dto/comment/comment';
import { MemberService } from '../member/member.service';
import { PropertyService } from '../property/property.service';
import { CommentInput } from '../../libs/dto/comment/comment.input';
import { BoardArticleService } from '../board-article/board-article.service';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { Message } from '../../libs/enums/common.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { T } from '../../libs/types/common';

@Injectable()
export class CommentService {
	constructor(
		@InjectModel('Comment') private readonly commentModel: Model<Comment>,
		private memberService: MemberService,
		private propertyService: PropertyService,
		private boardArticleService: BoardArticleService,
	) {}

	public async createComment(memberId: ObjectId, input: CommentInput): Promise<Comment> {
		input.memberId = memberId;
		input.commentRefId = shapeIntoMongoObjectId(input.commentRefId);
		let result = null;
		try {
			result = await this.commentModel.create(input);
		} catch (err) {
			console.log('Comment Service Error: createComment');
			throw new InternalServerErrorException(err.message);
		}
		switch (input.commentGroup) {
			case CommentGroup.PROPERTY:
				await this.propertyService.propertyStatsEditor({
					_id: input.commentRefId,
					targetKey: 'propertyComments',
					modifier: 1,
				});
			case CommentGroup.ARTICLE:
				await this.boardArticleService.boardArticleStatsEditor({
					_id: input.commentRefId,
					targetKey: 'articleComments',
					modifier: 1,
				});
			case CommentGroup.MEMBER:
				await this.memberService.memberStatsModifier({
					_id: input.commentRefId,
					targetKey: 'memberComments',
					modifier: 1,
				});
		}
		if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
		return result;
	}

	public async updateComment(memberId: ObjectId, input: CommentUpdate): Promise<Comment> {
		const search: T = { _id: input._id, memberId: memberId, commentStatus: CommentStatus.ACTIVE };
		const { commentStatus } = input;
		const result = await this.commentModel.findOneAndUpdate(search, input, { new: true });
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		if (commentStatus === CommentStatus.DELETE) {
			switch (result.commentGroup) {
				case CommentGroup.PROPERTY:
					await this.propertyService.propertyStatsEditor({
						_id: result.commentRefId,
						targetKey: 'propertyComments',
						modifier: -1,
					});
				case CommentGroup.ARTICLE:
					await this.boardArticleService.boardArticleStatsEditor({
						_id: result.commentRefId,
						targetKey: 'articleComments',
						modifier: -1,
					});
				case CommentGroup.MEMBER:
					await this.memberService.memberStatsModifier({
						_id: result.commentRefId,
						targetKey: 'memberComments',
						modifier: -1,
					});
			}
		}
		return result;
	}
}
