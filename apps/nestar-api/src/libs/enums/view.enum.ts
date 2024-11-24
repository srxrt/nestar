import { registerEnumType } from '@nestjs/graphql';

export enum ViewGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	PROPERTY = 'PROPERTY',
}
registerEnumType(ViewGroup, {
	name: 'ViewGroup',
});
