import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
	LIKE = 'LIKE',
	COMMENT = 'COMMENT',
}
registerEnumType(NotificationType, {
	name: 'NotificationType',
});

export enum NotificationStatus {
	WAIT = 'WAIT',
	READ = 'READ',
}
registerEnumType(NotificationStatus, {
	name: 'NotificationStatus',
});

export enum NotificationGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	PROPERTY = 'PROPERTY',
}
registerEnumType(NotificationGroup, {
	name: 'NotificationGroup',
});
