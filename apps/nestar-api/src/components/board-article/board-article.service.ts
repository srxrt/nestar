import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Model, ObjectId } from 'mongoose';
import { BoardArticle } from '../../libs/dto/board-article/board-article';
import { InjectModel } from '@nestjs/mongoose';
import { BoardArticleInput } from '../../libs/dto/board-article/board-article.input';
import { Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';

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
	public async getBoardArticle(memberId: ObjectId, articleId: ObjectId): Promise<BoardArticle> {}
}
