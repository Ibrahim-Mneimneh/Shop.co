import mongoose, {Document,Types, Schema} from "mongoose"

import { IProductRef } from "../types/modalTypes";


export interface ICart extends Document {
    _id:Types.ObjectId,
    user:Types.ObjectId,
    products:IProductRef[],
    totalPrice: Number
    updatePrice(): Promise<void>;
}


const cartSchema = new Schema<ICart>({
    user:{type: Schema.Types.ObjectId, ref: 'User',required:true},
    products:[{productId:{type:Schema.Types.ObjectId,ref:"Product",required:true},color:{type:String,required:true},quantity:[{quantity:{type:Number,required:true,min:[1,"Quantity must be at least 1"]},size:{type: String, required: true, enum: ["XXS","XS", "S", "M", "L", "XL", "XXL","XXXL","One-Size"]}}]
    }],
    totalPrice:{type:Number,default: 0.0,}
});


cartSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret._id
    delete ret.user
    return
}});

cartSchema.methods.updatePrice = async function (): Promise<void> {
    let total = 0;

    //Add a discount option for a special customer and Include a type for Product 
    for (let product of this.products) {
        const productData = await mongoose.model('Product').findById(product.productId);
        if (productData) {
            total += product.quantity * productData.price;
        }
    }

    this.totalPrice = total;
};

cartSchema.pre("save",async function(next){
    try{
        await this.updatePrice()
        next()
    }
    catch(error:any){
        next(error)
    }
})


export const CartModel =mongoose.model<ICart>("Cart",cartSchema);