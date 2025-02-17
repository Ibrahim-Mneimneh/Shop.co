import { PipelineStage } from "mongoose";
import { OrderModel } from "../../../models/orderModel";
import { ProductModel } from "../../../models/product/productModel";

interface OrderMatchFilter {
  paymentStatus?: string;
  createdAt?: { $gte: Date };
  deliveryStatus?: string;
  country?: string;
  totalPrice?: { $gte?: number; $lte?: number };
}

export const searchOrderAgg = async (
  filter: any,
  skip: number,
  limit: number = 10
) => {
  const {
    createdAt,
    deliveryStatus,
    minProfit,
    maxProfit,
    minPrice,
    maxPrice,
    country, // fix location -> multiple variables -> returned to json returned as one **
    name, // recipient name
  } = filter;
  const matchOpp: OrderMatchFilter = { paymentStatus: "Complete" };
  if (createdAt || deliveryStatus || country) {
    if (createdAt) {
      matchOpp.createdAt = { $gte: createdAt };
    }
    if (deliveryStatus) {
      matchOpp.deliveryStatus = deliveryStatus;
    }
    if (country) {
      matchOpp.country = country;
    }
    if (minPrice || maxPrice) {
      matchOpp.totalPrice = {};
      if (minPrice) matchOpp.totalPrice = { $gte: minPrice };
      if (maxPrice) matchOpp.totalPrice = { $lte: maxPrice };
    }
    if (minProfit || maxProfit) {
    }
  }
  const searchAgg: PipelineStage[] = [];
  if (name) {
    searchAgg.push({
      $search: {
        text: {
          query: name,
          path: ["name"],
        },
      },
    });
  }
  // Add the base match opperation
  searchAgg.push({ $match: matchOpp });

  if (minProfit | maxProfit) {
    searchAgg.push({
      $match: {
        $expr: {
          $and: [
            { $gte: [{ $subtract: ["$totalPrice", "$totalCost"] }, minProfit] },
            { $lte: [{ $subtract: ["$totalPrice", "$totalCost"] }, maxProfit] },
          ],
        },
      },
    });
  }
  // Add limit and skip
  searchAgg.push({
    $facet: {
      totalCount: [{ $count: "count" }],
      result: [{ $skip: skip }, { $limit: limit }],
    },
  });
  const result = await OrderModel.aggregate(searchAgg);
  return result.length === 0 ? [] : result[0];
};

export const searchProductAgg = async (filter: any, skip: number, limit: number = 10):Promise<{result:[],totalCount:{count:number}}> => {
  const {
    color,
    minPrice,
    maxPrice,
    category,
    subCategory,
    name,
    onSale,
    size,
    rating,
    sortField,
    sortOrder,
    inStock,
    unitsSoldRange, // admin fields
    status,
    minCost,
    maxCost,
    quantityLeft
  } = filter;

  const productFilter: any = {};
  const variantFilter: any = {};

  // product attributes
  if (status) productFilter.status = status;
  if (category) productFilter.category = category;
  if (subCategory) productFilter.subCategory = subCategory;
  if (rating) productFilter.rating = { $gte: rating };

  // variant attributes
  if (status) productFilter.status = status;
  if (color) variantFilter["variant.color"] = color;
  if (onSale) variantFilter["variant.isOnSale"] = onSale;
  if (inStock) variantFilter["variant.stockStatus"] = inStock === "In Stock";

  if (minPrice || maxPrice) {
    variantFilter.price = {};
    if (minPrice) variantFilter.price.$gte = minPrice;
    if (maxPrice) variantFilter.price.$lte = maxPrice;
  }

  if (minCost || maxCost) {
    variantFilter.price = {};
    if (minCost) variantFilter.cost.$gte = minCost;
    if (minCost) variantFilter.cost.$lte = maxCost;
  }

  if(unitsSoldRange){
    switch (unitsSoldRange) {
      case "0-50":
        variantFilter["variant.unitsSold"] = { $gte: 0 ,$lte:50};
        break;
      case "0-100":
        variantFilter["variant.unitsSold"] = { $gte: 0, $lte: 100 };
        break;
      case "0-500":
        variantFilter["variant.unitsSold"] = { $gte: 0, $lte: 500 };
        break;
      case "500-1000":
        variantFilter["variant.unitsSold"] = { $gte: 500, $lte: 1000 };
        break;
      case "1000-10000":
        variantFilter["variant.unitsSold"] = { $gte: 1000, $lte: 10000 };
        break;
      case "10000":
        variantFilter["variant.unitsSold"] = { $gt: 10000 };
        break;
      default:
        variantFilter["variant.unitsSold"] = { $gt: 0 };
        break;
    }
  }
  if (quantityLeft) {
    switch (quantityLeft) {
      case "0-50":
        variantFilter["variant.totalQuantity"] = { $gte: 0, $lte: 50 };
        break;
      case "50-100":
        variantFilter["variant.totalQuantity"] = { $gte: 50, $lte: 100 };
        break;
      case "100-200":
        variantFilter["variant.totalQuantity"] = { $gte: 100, $lte: 200 };
        break;
      case "200-300":
        variantFilter["variant.totalQuantity"] = { $gte: 200, $lte: 300 };
        break;
      case "300-400":
        variantFilter["variant.totalQuantity"] = { $gte: 300, $lte: 400 };
        break;
      case "400-500":
        variantFilter["variant.totalQuantity"] = { $gte: 400, $lte: 500 };
        break;
      case "+500":
        variantFilter["variant.totalQuantity"] = { $gt: 500 };
        break;
    }
  }

  const searchProductAgg: PipelineStage[] = [];

  // Check name
  if (name) {
    searchProductAgg.push({
      $search: {
        text: {
          query: name,
          path: ["name", "description"],
        },
      },
    });
  }
  // Add match product if needed
  if (Object.keys(productFilter).length != 0) {
    searchProductAgg.push({ $match: productFilter });
  }
  // get the variants & rename the price attribute
  searchProductAgg.push(
    {
      $lookup: {
        from: "productvariants",
        localField: "variants",
        foreignField: "_id",
        as: "variant",
      },
    },
    {
      $unwind: {
        path: "$variant",
      },
    },
    {
      $addFields: {
        // ensure price attribute is salePrice when onSale
        price: {
          $switch: {
            branches: [
              {
                case: {
                  $eq: ["$variant.isOnSale", true],
                },
                then: "$variant.saleOptions.salePrice",
              },
              {
                case: {
                  $gte: ["$variant.isOnSale", false],
                },
                then: "$variant.originalPrice",
              },
            ],
            default: 0,
          },
        },
      },
    }
  );
  // add match variants if needed
  if (Object.keys(variantFilter).length != 0) {
    searchProductAgg.push({ $match: variantFilter });
  }
  // Search by size, unwind and match, group by variants
  if (size) {
    searchProductAgg.push({
      $unwind: {
        path: "$variant.quantity",
      },
    });
    searchProductAgg.push({
      $match: {
        "variant.quantity.size": { $in: size },
      },
    });
    if (size.length > 0) {
      searchProductAgg.push({
        $group: {
          _id: "$variant._id",
          variant: {
            $first: {
              _id: "$variant._id",
              isOnSale: "$variant.isOnSale",
              saleOptions: {
                endDate: "$variant.saleOptions.endDate",
                discountPercentage: "$variant.saleOptions.discountPercentage",
                salePrice: "$variant.saleOptions.salePrice",
              },
              images: "$variant.images",
              stockStatus: "$variant.stockStatus",
              status:"$variant.status",
            },
          },
          name: { $first: "$name" },
          category: { $first: "$category" },
          subCategory: { $first: "$subCategory" },
          rating: { $first: "$rating" },
          price: { $first: "$price" },
        },
      });
    }
  }
  if (sortField) {
    const sortObj: {
      price?: 1 | -1;
      rating?: 1 | -1;
      "variant.unitsSold"?: 1 | -1;
    } = {};

    if (sortOrder) {
      if (sortField == "rating") sortObj.rating = sortOrder === "asc" ? 1 : -1;
      if (sortField === "price") sortObj.price = sortOrder === "asc" ? 1 : -1;
      if (sortField === "popularity")
        sortObj["variant.unitsSold"] = sortOrder === "asc" ? 1 : -1;
    } else {
      // SortOrder not given assume ascending
      if (sortField == "rating") sortObj.rating = 1;
      if (sortField === "price") sortObj.price = 1;
      if (sortField === "popularity") sortObj["variant.unitsSold"] = 1;
    }
    searchProductAgg.push({
      $sort: sortObj,
    });
  }
  // Filter attrbutes
  searchProductAgg.push({
    $project: {
      _id: "$variant._id",
      name: 1,
      category: 1,
      subCategory: 1,
      rating: 1,
      status:"$variant.status",
      images: { $first: "$variant.images" },
      isOnSale: "$variant.isOnSale",
      stockStatus: "$variant.stockStatus",
      saleOptions: {
        endDate: {
          $cond: {
            if: { $eq: ["$variant.isOnSale", true] },
            then: { $ifNull: ["$variant.saleOptions.endDate", null] },
            else: null,
          },
        },
        discountPercentage: {
          $cond: {
            if: { $eq: ["$variant.isOnSale", true] },
            then: {
              $ifNull: ["$variant.saleOptions.discountPercentage", null],
            },
            else: null,
          },
        },
        salePrice: {
          $cond: {
            if: { $eq: ["$variant.isOnSale", true] },
            then: { $ifNull: ["$variant.saleOptions.salePrice", null] },
            else: null,
          },
        },
      },
    },
  });
  // Add limit and skip
  searchProductAgg.push(
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        result: [{ $skip: skip }, { $limit: limit }],
      },
    },
    {
      $unwind: {
        path: "$totalCount",
      },
    }
  );
  const result = await ProductModel.aggregate(searchProductAgg);
  return result.length === 0 ? {result:[],totalCount:{count:0}} : result[0];
};
