import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Property } from '../../libs/dto/property/property';
import { PropertyInput } from '../../libs/dto/property/property.input';
import { Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { ViewInput } from '../../libs/dto/view/view.input';
import { ViewGroup } from '../../libs/enums/view.enum';
import { T } from '../../libs/types/common';
import { PropertyStatus } from '../../libs/enums/property.enum';

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
}
