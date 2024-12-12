import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Property } from '../../libs/dto/property/property';
import { PropertyInput, PropertyUpdateInput } from '../../libs/dto/property/property.input';
import { Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { ViewInput } from '../../libs/dto/view/view.input';
import { ViewGroup } from '../../libs/enums/view.enum';
import { T } from '../../libs/types/common';
import { PropertyStatus } from '../../libs/enums/property.enum';
import * as moment from 'moment';

@Injectable()
export class PropertyService {
	constructor(
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		private authService: AuthService,
		private viewService: ViewService,
		private memberService: MemberService,
	) {}

	public async createProperty(input: PropertyInput): Promise<Property> {
		try {
			const result = await this.propertyModel.create(input);
			//increase memberProperties
			await this.memberService.memberStatsModifier({
				_id: result.memberId,
				targetKey: 'memberProperties',
				modifier: 1,
			});
			return result;
		} catch (err) {
			console.log('Error, Service.createProperty', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getProperty(memberId: ObjectId, propertyId: ObjectId): Promise<Property> {
		const search: T = { _id: propertyId, propertyStatus: PropertyStatus.ACTIVE };
		const targetProperty = await this.propertyModel.findOne(search).lean<Property>().exec();

		if (!targetProperty) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput: ViewInput = {
				viewRefId: propertyId,
				memberId: memberId,
				viewGroup: ViewGroup.PROPERTY,
			};
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.propertyModel.findByIdAndUpdate(propertyId, { $inc: { propertyViews: 1 } }, { new: true }).exec();
				targetProperty.propertyViews++;
			}
		}
		targetProperty.memberData = await this.memberService.getMember(null, memberId);
		return targetProperty;
	}

	public async updateProperty(memberId: ObjectId, input: PropertyUpdateInput): Promise<Property> {
		let { propertyStatus, soldAt, deletedAt } = input;
		const search: T = { _id: input._id, memberId: memberId, propertyStatus: PropertyStatus.ACTIVE };
		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();

		const result: Property = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();

		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsModifier({
				_id: memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}
		return result;
	}
}
