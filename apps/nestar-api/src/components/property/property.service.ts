import { BadRequestException, Injectable, InternalServerErrorException, Search } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Properties, Property } from '../../libs/dto/property/property';
import {
	AgentPropertiesInquiry,
	AllPropertiesInquiry,
	PropertiesInquiry,
	PropertyInput,
	PropertyUpdateInput,
} from '../../libs/dto/property/property.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { ViewInput } from '../../libs/dto/view/view.input';
import { ViewGroup } from '../../libs/enums/view.enum';
import { StatsModifier, T } from '../../libs/types/common';
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

	public async getProperties(memberId: ObjectId, input: PropertiesInquiry): Promise<Properties> {
		const match: T = { propertyStatus: PropertyStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		this.shapeMatchQuery(match, input);
		console.log('MATCH:', match);
		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async getAgentProperties(memberId: ObjectId, input: AgentPropertiesInquiry): Promise<Properties> {
		const { propertyStatus } = input.search;
		if (propertyStatus === PropertyStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		const match: T = { memberId: memberId, propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE } };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async getAllPropertiesByAdmin(input: AllPropertiesInquiry): Promise<Properties> {
		const { propertyStatus, propertyLocationList } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		if (propertyStatus) match.propertyStatus = propertyStatus;
		if (propertyLocationList) match.propertyLocation = { $in: { propertyLocationList } };
		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async updatePropertyByAdmin(input: PropertyUpdateInput): Promise<Property> {
		let { propertyStatus, soldAt, deletedAt } = input;
		const search: T = {
			_id: input._id,
			propertyStatus: PropertyStatus.ACTIVE,
		};
		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();
		const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		if (soldAt || deletedAt) {
			await this.memberService.memberStatsModifier({
				_id: result.memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}
		return result;
	}

	public async removePropertyByAdmin(propertyId: ObjectId): Promise<Property> {
		const search: T = { _id: propertyId, propertyStatus: PropertyStatus.DELETE };
		const result = await this.propertyModel.findOneAndDelete(search).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result;
	}

	private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
		const {
			memberId,
			locationList,
			roomsList,
			bedsList,
			typeList,
			periodsRange,
			pricesRange,
			squaresRange,
			options,
			text,
		} = input.search;
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (locationList) match.propertyLocation = { $in: locationList };
		if (roomsList) match.propertyRooms = { $in: roomsList };
		if (bedsList) match.propertyBeds = { $in: bedsList };
		if (typeList) match.propertyType = { $in: typeList };
		if (pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };
		if (squaresRange) match.propertySquare = { $gte: squaresRange.start, $lte: squaresRange.end };
		if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
		if (options) {
			match['$or'] = options.map((ele) => {
				return { [ele]: true };
			});
		}
	}

	public async propertyStatsEditor(input: StatsModifier): Promise<Property> {
		console.log('Property Stats Editor executed');
		const { _id, targetKey, modifier } = input;
		return await this.propertyModel.findOneAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true });
	}
}
