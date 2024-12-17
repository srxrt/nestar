import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Model, ObjectId } from 'mongoose';
import { BoardArticle } from '../../libs/dto/board-article/board-article';
import { InjectModel } from '@nestjs/mongoose';
import { BoardArticleInput } from '../../libs/dto/board-article/board-article.input';
import { Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';
import { StatsModifier, T } from '../../libs/types/common';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { ViewInput } from '../../libs/dto/view/view.input';
import { ViewGroup } from '../../libs/enums/view.enum';

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

	public async boardArticleStatsEditor(input: StatsModifier): Promise<BoardArticle> {
		console.log('Board Article Stats Modifier executed');
		const { _id, targetKey, modifier } = input;
		return await this.boardArticleModel.findOneAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true });
	}
}
