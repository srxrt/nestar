import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';

@Resolver()
export class MemberResolver {
	constructor(private readonly memberService: MemberService) {}

	@Mutation(() => String)
	@UsePipes(ValidationPipe)
	public async signup(@Args('input') input: MemberInput): Promise<string> {
		console.log('Mutation: signup');
		console.log('Input', input);
		return await this.memberService.signup();
	}

	@Mutation(() => String)
	@UsePipes(ValidationPipe)
	public async login(@Args('input') input: LoginInput): Promise<string> {
		console.log('Mutation: login');
		return await this.memberService.login();
	}

	@Mutation(() => String)
	public async updateMember(): Promise<string> {
		console.log('Mutation: updateMember');
		return await this.memberService.updateMember();
	}

	@Query(() => String)
	public async getMember(): Promise<string> {
		console.log('Query: getMember');
		return await this.memberService.getMember();
	}
}
