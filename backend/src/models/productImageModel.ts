import mongoose,{Document,Model,Schema,Types} from "mongoose";
import { IObjectId } from "../types/modalTypes";

export interface IProductImage extends Document{
    _id:Types.ObjectId,
    image:string,
    linked:boolean,
    expiresAt?:Date,
}


interface IProductImageModel extends Model<IProductImage> {
  linkImages(imageIds: Types.ObjectId[]): Promise<void>;
}

const ProductImageSchema = new Schema<IProductImage>({
    image:{type:String, required:true,},
    linked:{type:Boolean, default:false},
    expiresAt:{type:Date,  validate:{validator: function(value:Date){
        return !(this.linked && value)
    },message: "Cannot set expiration date for linked images",}}
})

ProductImageSchema.statics.linkImages= async function(imageIds:IObjectId[]):Promise<{success: boolean}>{
    try{
        const images:IProductImage[] = await this.find({ _id: { $in: imageIds } }); 
        if (!images || images.length === 0) {
            throw new Error('No images found');
        }
        const operations = images.map((image:IProductImage)=>(
            {updateOne:{
                filter:{_id:image._id},
                update:{$set:{linked:true,expiresAt:undefined}},
                upsert:false
            }}
        ))
        // Update multiple images
        const result = await this.bulkWrite(operations)
        const success:boolean=(result.modifiedCount===imageIds.length)
        return {success}
    }
    catch(error:any){
        console.log("LinkImages - "+error)
        throw new Error('Error linking images: ' + error.message);
    }
}

ProductImageSchema.statics.saveBatch= async function(base64Images:string[]):Promise<{success: boolean,imageIds:string[]}>{
    try{
        const operations = base64Images.map((base64Image) => ({
        insertOne: {
            document: { image:base64Image }
        }
        }));
        const result = await this.bulkWrite(operations);
        const savedImageIds:string[]=Object.values(result.insertedIds).map(id => id.toString());
        const success:boolean = result.insertedCount === base64Images.length;
        return {success,imageIds:savedImageIds}
    }catch(error:any){
        console.log("saveBatch - "+error)
        throw new Error('Error linking images: ' + error.message);
    }
}

ProductImageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ProductImageModel =mongoose.model<IProductImage,IProductImageModel>("ProductImage",ProductImageSchema);