import { registerEnumType } from '@nestjs/graphql';

export enum LikeGroup {
	MEMBER = 'MEMBER',
	PROPERTY = 'PROPERTY',
	ARTICLE = 'ARTICLE',
}
registerEnumType(LikeGroup, {
	name: 'LikeGroup',
});
