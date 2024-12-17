import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Model, ObjectId } from 'mongoose';
import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
import { InjectModel } from '@nestjs/mongoose';
import {
	AllBoardArticlesInquiry,
	BoardArticleInput,
	BoardArticlesInquiry,
} from '../../libs/dto/board-article/board-article.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';
import { StatsModifier, T } from '../../libs/types/common';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { ViewInput } from '../../libs/dto/view/view.input';
import { ViewGroup } from '../../libs/enums/view.enum';
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';
import { lookupMember } from '../../libs/config';

@Injectable()
export class BoardArticleService {
	constructor(
		@InjectModel('BoardArticle') private readonly boardArticleModel: Model<BoardArticle>,
		private memberService: MemberService,
		private viewService: ViewService,
	) {}

	public async createBoardArticle(memberId: ObjectId, input: BoardArticleInput): Promise<BoardArticle> {
		input.memberId = memberId;
		try {
			const result = await this.boardArticleModel.create(input);
			await this.memberService.memberStatsModifier({ _id: memberId, targetKey: 'memberArticles', modifier: 1 });
			return result;
		} catch (err) {
			console.log('Board Article Service: createBoardArticle', err.message);
			throw new InternalServerErrorException(Message.CREATE_FAILED);
		}
	}
	public async getBoardArticle(memberId: ObjectId, articleId: ObjectId): Promise<BoardArticle> {
		const search: T = { _id: articleId, articleStatus: BoardArticleStatus.ACTIVE };
		const targetArticle = await this.boardArticleModel.findOne(search).lean<BoardArticle>().exec();
		if (!targetArticle) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput: ViewInput = {
				viewRefId: articleId,
				memberId: memberId,
				viewGroup: ViewGroup.ARTICLE,
			};
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.boardArticleStatsEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
				targetArticle.articleViews++;
			}
		}

		return targetArticle;
	}

	public async updateBoardArticle(memberId: ObjectId, input: BoardArticleUpdate): Promise<BoardArticle> {
		const { articleStatus } = input;
		const search: T = { _id: input._id, memberId: memberId, articleStatus: BoardArticleStatus.ACTIVE };

		const result = await this.boardArticleModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (articleStatus === BoardArticleStatus.DELETE) {
			await this.memberService.memberStatsModifier({
				_id: memberId,
				targetKey: 'memberArticles',
				modifier: -1,
			});
		}
		return result;
	}

	public async getBoardArticles(memberId: ObjectId, input: BoardArticlesInquiry): Promise<BoardArticles> {
		const { articleCategory, text } = input?.search;
		const match: T = { articleStatus: BoardArticleStatus.ACTIVE };
		if (articleCategory) match.articleCategory = articleCategory;
		if (input?.search?.memberId) match.memberId = input.search?.memberId;
		if (text) match.articleTitle = { $regex: new RegExp(text, 'i') };

		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.boardArticleModel.aggregate([
			{ $match: match },
			{ $sort: sort },
			{
				$facet: {
					list: [
						{ $skip: (input.page - 1) * input.limit },
						{ $limit: input.limit },
						lookupMember,
						{ $unwind: '$memberData' },
					],
					metaCounter: [{ $count: 'total' }],
				},
			},
		]);

		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async getAllBoardArticlesByAdmin(memberId: ObjectId, input: AllBoardArticlesInquiry): Promise<BoardArticles> {
		const { articleCategory, articleStatus } = input?.search;
		const match: T = {};
		if (articleCategory) match.articleCategory = articleCategory;
		if (articleStatus) match.articleStatus = articleStatus;

		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.boardArticleModel.aggregate([
			{ $match: match },
			{ $sort: sort },
			{
				$facet: {
					list: [
						{ $skip: (input.page - 1) * input.limit },
						{ $limit: input.limit },
						lookupMember,
						{ $unwind: '$memberData' },
					],
					metaCounter: [{ $count: 'total' }],
				},
			},
		]);

		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async boardArticleStatsEditor(input: StatsModifier): Promise<BoardArticle> {
		console.log('Board Article Stats Modifier executed');
		const { _id, targetKey, modifier } = input;
		return await this.boardArticleModel.findOneAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true });
	}
}
