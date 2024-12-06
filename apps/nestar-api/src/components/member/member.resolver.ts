import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Member } from '../../libs/dto/member/member';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver()
export class MemberResolver {
	constructor(private readonly memberService: MemberService) {}

	@Mutation(() => Member)
	public async signup(@Args('input') input: MemberInput): Promise<Member> {
		console.log('Mutation: signup');
		return await this.memberService.signup(input);
	}

	@Mutation(() => Member)
	public async login(@Args('input') input: LoginInput): Promise<Member> {
		console.log('Mutation: login');
		return await this.memberService.login(input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => String)
	public async updateMember(@AuthMember('_id') memberId: ObjectId): Promise<string> {
		console.log('Mutation: updateMember');
		return await this.memberService.updateMember();
	}

	@UseGuards(AuthGuard)
	@Query(() => String)
	public async checkAuth(@AuthMember('memberNick') memberNick: string): Promise<string> {
		console.log('Query: checkAuth');
		console.log('Member Nick:', memberNick);
		return `HI, ${memberNick}`;
	}

	@Query(() => String)
	public async getMember(): Promise<string> {
		console.log('Query: getMember');
		return await this.memberService.getMember();
	}

	@Roles(MemberType.USER, MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Query(() => String)
	public async checkAuthRoles(@AuthMember() authMember: Member): Promise<string> {
		console.log('Query: checkAuthRoles');
		console.log('memberNick:', authMember.memberNick);
		return `Hi ${authMember.memberNick}, you are ${authMember.memberType} (memberId: ${authMember._id})`;
	}

	/** ADMIN */
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => String)
	public async getAllMembersByAdmin(): Promise<string> {
		console.log('Mutation: getAllMembersByAdmin');
		return '';
	}

	@Mutation(() => String)
	public async updateMemberByAdmin(): Promise<string> {
		console.log('Mutation: updateMemberByAdmin');
		return '';
	}
}
