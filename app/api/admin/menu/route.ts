import s3 from "@/lib/aws";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const data = {
      items: formData.get("items"),
      description: formData.get("description"),
      thumbnail: formData.get("thumbnail"),
      date: formData.get("date"),
    };

    const items = JSON.parse(data.items as string);

    if (items.length < 1) {
      return ApiResponse(
        false,
        "No items added. Please select items name.",
        400
      );
    }

    if (!data.date) {
      return ApiResponse(false, "No date selected. Please select a date.", 400);
    }

    const selectedDay = new Date(data.date.toString().split("T")[0]);

    const thumbnailFile = formData.get("thumbnail");
    let imageurl;

    if (!thumbnailFile) {
      return ApiResponse(false, "No file selected.", 400);
    }

    if (thumbnailFile instanceof File) {
      const fileName = `menu/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}-${thumbnailFile.name}`;

      if (!fileName) {
        console.log("File name is empty");
        return ApiResponse(false, "Failed to generate file name.", 500);
      }

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
        console.log(error);
        return ApiResponse(false, "Failed to upload file.", 500);
      }
    }

    const existingMenu = await prisma.dailyMenu.findFirst({
      where: {
        date: selectedDay,
      },
    });

    if (existingMenu) {
      return ApiResponse(false, "Menu already exists for this date.", 400);
    }

    await prisma.dailyMenu.create({
      data: {
        date: selectedDay,
        menuItems: {
          create: await Promise.all(
            items.map(async (item: { itemId: string; itemName: string }) => {
              const existingMenuItem = await prisma.menuItem.findFirst({
                where: {
                  name: item.itemName,
                  itemId: item.itemId,
                },
              });

              if (existingMenuItem) {
                return {
                  menuItemId: existingMenuItem.id,
                };
              } else {
                const newMenuItem = await prisma.menuItem.create({
                  data: {
                    name: item.itemName,
                    itemId: item.itemId,
                  },
                });
                return {
                  menuItemId: newMenuItem.id,
                };
              }
            })
          ),
        },
        description: (data.description as string) || "",
        thumbnail: imageurl,
      },
      include: {
        menuItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return ApiResponse(true, "Menu created successfully.", 200);
  } catch (error) {
    console.log("Error while creating menu", error);
    return ApiResponse(false, "Error while creating menu", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const formData = await req.formData();
    const data = {
      items: formData.get("items"),
      description: formData.get("description"),
      thumbnail: formData.get("thumbnail"),
      date: formData.get("date"),
    };

    const items = JSON.parse(data.items as string);

    if (items.length < 1) {
      return ApiResponse(
        false,
        "No items added. Please select items name.",
        400
      );
    }

    if (!data.date) {
      return ApiResponse(false, "No date selected. Please select a date.", 400);
    }

    const selectedDay = new Date(data.date as string);

    const thumbnailFile = formData.get("thumbnail");
    let imageurl;

    const existingMenu = await prisma.dailyMenu.findFirst({
      where: {
        date: selectedDay,
      },
      include: {
        menuItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!existingMenu) {
      return ApiResponse(false, "Menu does not exist for this date.", 400);
    }

    if (thumbnailFile instanceof File) {
      const fileName = `menu/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}-${thumbnailFile.name}`;

      if (!fileName) {
        console.log("File name is empty");
        return ApiResponse(false, "Failed to generate file name.", 500);
      }

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

        if (existingMenu.thumbnail) {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: existingMenu.thumbnail,
          });

          if (!existingMenu.thumbnail) {
            console.log("Existing menu thumbnail is empty");
            return ApiResponse(false, "Failed to delete old thumbnail.", 500);
          }

          await s3.send(deleteCommand);
        }
      } catch (error) {
        console.log(error);
        return ApiResponse(false, "Failed to upload file.", 500);
      }
    }

    await prisma.dailyMenu.update({
      where: { id: existingMenu.id },
      data: {
        menuItems: {
          deleteMany: {},
          create: await Promise.all(
            items.map(async (item: { itemId: string; itemName: string }) => {
              const existingMenuItem = await prisma.menuItem.findFirst({
                where: {
                  name: item.itemName,
                  itemId: item.itemId,
                },
              });

              if (existingMenuItem) {
                return {
                  menuItem: {
                    connect: { id: existingMenuItem.id },
                  },
                };
              } else {
                return {
                  menuItem: {
                    create: {
                      name: item.itemName,
                      item: {
                        connect: { id: item.itemId },
                      },
                    },
                  },
                };
              }
            })
          ),
        },
        description: (data.description as string) || "",
        thumbnail: imageurl || existingMenu.thumbnail,
      },
      include: {
        menuItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return ApiResponse(
      true,
      "Menu updated for " +
        selectedDay.toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
      200
    );
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Error while updating menu", 500);
  } finally {
    await prisma.$disconnect();
  }
}
