import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { PropertyLocation, PropertyStatus, PropertyType } from '../../enums/property.enum';
import { ObjectId } from 'mongoose';

@InputType()
export class PropertyInput {
	@IsNotEmpty()
	@Field(() => PropertyType)
	propertyType: PropertyType;

	@IsNotEmpty()
	@Field(() => PropertyLocation)
	propertyLocation: PropertyLocation;

	@IsNotEmpty()
	@Length(3, 100)
	@Field(() => String)
	propertyAddress: string;

	@IsNotEmpty()
	@Length(3, 100)
	@Field(() => String)
	propertyTitle: string;

	@IsNotEmpty()
	@Field(() => Number)
	propertyPrice: number;

	@IsNotEmpty()
	@Field(() => Number)
	propertySquare: number;

	@IsNotEmpty()
	@IsInt()
	@Min(1)
	@Field(() => Int)
	propertyBeds: number;

	@IsNotEmpty()
	@Field(() => Int)
	propertyRooms: number;

	@IsNotEmpty()
	@Field(() => [String])
	propertyImages: string[];

	@IsOptional()
	@Length(5, 500)
	@Field(() => String, { nullable: true })
	propertyDesc?: string;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	propertyBarter?: boolean;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	propertyRent?: boolean;

	memberId?: ObjectId;

	@IsOptional()
	@Field(() => Date, { nullable: true })
	constructedAt?: Date;
}

@InputType()
export class PropertyUpdateInput {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsOptional()
	@Field(() => PropertyType, { nullable: true })
	propertyType?: PropertyType;

	@IsOptional()
	@Field(() => PropertyStatus, { nullable: true })
	propertyStatus?: PropertyStatus;

	@IsOptional()
	@Field(() => PropertyLocation, { nullable: true })
	propertyLocation?: PropertyLocation;

	@IsOptional()
	@Length(3, 100)
	@Field(() => String, { nullable: true })
	propertyAddress?: string;

	@IsOptional()
	@Length(3, 100)
	@Field(() => String, { nullable: true })
	propertyTitle?: string;

	@IsOptional()
	@Field(() => Number, { nullable: true })
	propertyPrice?: number;

	@IsOptional()
	@Field(() => Number, { nullable: true })
	propertySquare?: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Field(() => Int, { nullable: true })
	propertyBeds?: number;

	@IsOptional()
	@Field(() => Int, { nullable: true })
	propertyRooms?: number;

	@IsOptional()
	@Field(() => [String], { nullable: true })
	propertyImages?: string[];

	@IsOptional()
	@Length(5, 500)
	@Field(() => String, { nullable: true })
	propertyDesc?: string;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	propertyBarter?: boolean;

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	propertyRent?: boolean;

	soldAt?: Date;
	deletedAt?: Date;
	memberId?: ObjectId;

	@IsOptional()
	@Field(() => Date, { nullable: true })
	constructedAt?: Date;
}
