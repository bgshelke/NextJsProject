import s3 from "@/lib/aws";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { UnitType } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const items = await prisma.item.findMany({
      where: {
        OR: [{ deletedAt: { isSet: false } }, { deletedAt: null }],
      },
      select: {
        id: true,
        itemName: true,
        price: true,
        unit: true,
        unitType: true,
        mealPreference: true,
        planType: true,
        thumbnail: true,
        createdAt: true,
      },
    });

    return ApiResponse(true, "Menu items fetched successfully", 200, items);
  } catch (error) {
    console.log("Error while fetching menu items", error);
    return ApiResponse(false, "Error while fetching menu items", 500);
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const data = {
      item: formData.get("item"),
      price: formData.get("price"),
      unit: formData.get("unit"),
      unitType: formData.get("unitType"),
      mealPreference: formData.get("mealPreference"),
      planType: JSON.parse(formData.get("planType") as string),
      thumbnail: formData.get("thumbnail"),
    };

    if (
      !data.item &&
      !data.unit &&
      !data.price &&
      !data.unitType &&
      !data.mealPreference &&
      !data.planType &&
      !data.thumbnail
    ) {
      return ApiResponse(false, "All fields are required", 400);
    }

    const { item, unit, price, unitType, mealPreference, planType, thumbnail } =
      data;

    const existingItem = await prisma.item.findFirst({
      where: {
        itemName: item as string,
      },
    });
    if (existingItem) {
      return ApiResponse(false, "Item already exists", 400);
    }

    const thumbnailFile = thumbnail;

    if (!thumbnailFile) {
      return ApiResponse(
        false,
        "No file selected. Please upload a item thumbnail.",
        400
      );
    }

    if (thumbnailFile instanceof File) {
      const fileName = `item/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}-${thumbnailFile.name}`;

      let imageurl;
      const upload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: fileName,
          Body: thumbnailFile.stream(),
          ContentType: thumbnailFile.type,
          ACL: "public-read",
        },
      });

      try {
        const result = await upload.done();
        imageurl = result.Key as string;
      } catch (error) {
        throw new Error("Failed to upload file.", { cause: error });
      }

      await prisma.item.create({
        data: {
          itemName: item as string,
          unit: parseFloat(unit as string),
          unitType: (unitType as UnitType) || "OZ",
          price: parseInt(price as string),
          mealPreference: mealPreference === "NON_VEG" ? "NON_VEG" : "VEG",
          planType: planType,
          thumbnail: imageurl,
        },
      });
    } else {
      return ApiResponse(false, "Invalid file type", 400);
    }

    return ApiResponse(true, "Item added successfully", 200);
  } catch (error) {
    console.log("Error while adding menu items", error);
    return ApiResponse(false, "Error while adding menu items", 500);
  } finally {
    prisma.$disconnect();
  }
}

export async function PUT(req: Request) {
  try {
    const formData = await req.formData();
    const data = {
      id: formData.get("id") as string,
      item: formData.get("item"),
      price: formData.get("price"),
      unit: formData.get("unit"),
      unitType: formData.get("unitType"),
      mealPreference: formData.get("mealPreference"),
      planType: JSON.parse(formData.get("planType") as string),
      thumbnail: formData.get("thumbnail"),
    };
    if (!data.id) {
      return ApiResponse(false, "ID is required", 400);
    }

    const {
      id,
      item,
      unit,
      price,
      unitType,
      mealPreference,
      planType,
      thumbnail,
    } = data;

    const existingItem = await prisma.item.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return ApiResponse(false, "Item not found", 404);
    }

    let imageurl = existingItem.thumbnail;

    if (thumbnail instanceof File) {
      const oldFileName = existingItem.thumbnail;

      if (oldFileName) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: oldFileName,
          })
        );
      }

      const fileName = `item/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}-${thumbnail.name}`;

      const upload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: fileName,
          Body: thumbnail.stream(),
          ContentType: thumbnail.type,
          ACL: "public-read",
        },
      });

      try {
        const result = await upload.done();
        imageurl = result.Key as string;
      } catch (error) {
        return ApiResponse(false, "Failed to upload file.", 500);
      }
    }

    await prisma.item.update({
      where: { id },
      data: {
        itemName: item as string,
        unit: parseFloat(unit as string),
        unitType: (unitType as UnitType) || "OZ",
        price: parseInt(price as string),
        mealPreference: mealPreference === "NON_VEG" ? "NON_VEG" : "VEG",
        planType: planType,
        thumbnail: imageurl,
      },
    });
    return ApiResponse(true, "Item updated successfully", 200);
  } catch (error) {
    console.log("Error while updating menu items", error);
    return ApiResponse(false, "Error while updating menu items", 500);
  } finally {
    prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, type } = await request.json();

    const atleastone = await prisma.item.findMany();
    if (atleastone.length <= 1) {
      return ApiResponse(false, "Atleast one item is required", 400);
    }

    if (!id) {
      return ApiResponse(false, "ID is required", 400);
    }
    const item = await prisma.item.findUnique({
      where: { id },
    });
    if (!item) {
      return ApiResponse(false, "Item not found", 404);
    }

    if (type === "soft") {
      await prisma.item.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
      return ApiResponse(true, "Item moved to trash.", 200);
    }

    if (type === "hard") {
      if (item.thumbnail) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: item.thumbnail,
          })
        );
      }
      await prisma.item.delete({
        where: {
          id: id,
        },
      });
      return ApiResponse(true, "Item deleted successfully", 200);
    }

    return ApiResponse(false, "Invalid type", 400);
  } catch (error) {
    return ApiResponse(false, "Error while deleting menu items", 500);
  } finally {
    await prisma.$disconnect();
  }
}
