import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member } from '../../libs/dto/member/member';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { MemberStatus } from '../../libs/enums/member.enum';
import { Message } from '../../libs/enums/common.enum';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class MemberService {
	constructor(
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		private authService: AuthService,
	) {}

	public async signup(input: MemberInput): Promise<Member> {
		try {
			console.log('MEMBER INPUT', input);
			input.memberPassword = await this.authService.hashPassword(input.memberPassword);
			const result: Member = await this.memberModel.create(input);
			// TODO: Access token creation
			result.accessToken = await this.authService.createToken(result);
			return result;
		} catch (err) {
			console.log('Error: Service.signup:', err.message);
			throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
		}
	}

	public async login(input: LoginInput): Promise<Member> {
		const response = await this.memberModel.findOne({ memberNick: input.memberNick }).select('+memberPassword').exec();

		if (!response || response.memberStatus === MemberStatus.DELETE) {
			throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
		}

		if (response.memberStatus === MemberStatus.BLOCK) throw new InternalServerErrorException(Message.BLOCKED_USER);

		const isMatch = await this.authService.comparePasswords(input.memberPassword, response.memberPassword);
		if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);

		response.accessToken = await this.authService.createToken(response);
		return response;
	}

	public async updateMember(): Promise<string> {
		return 'updateMember executed';
	}

	public async getMember(): Promise<string> {
		return 'getMember executed';
	}

	public async getAllMembersByAdmin(): Promise<string> {
		return 'getAllMembersByAdmin executed';
	}
	public async updateMemberByAdmin(): Promise<string> {
		return 'updateMemberByAdmin executed';
	}
}
