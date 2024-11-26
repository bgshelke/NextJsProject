import { UserSelectedPlan } from "@/types/main";
import { Kitchen } from "@prisma/client";
import {
  Body,
  Container,
  Column,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Heading,
  Button,
} from "@react-email/components";
import * as React from "react";

const baseUrl = process.env.NEXT_PUBLIC_URL;

export default function GuestOrderTemplate({
  orderId,
  username,
  orderDetails,
  orderType,
  kitchenInfo,
}: {
  orderId: string;
  username: string;
  orderDetails: UserSelectedPlan;
  orderType: "DELIVERY" | "PICKUP";
  kitchenInfo?: Kitchen;
}) {
  return (
    <Html>
      <Head />
      <Preview>Thank you for your order</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ marginTop: "10px" }}>
            <Row>
              <Column>
                <Img
                  style={sectionLogo}
                  src={`${baseUrl}/logo.png`}
                  width="68"
                  height="55"
                  alt="Dabbahwala"
                />
              </Column>
            </Row>
          </Section>

          <Section style={paragraphContent}>
            <Hr style={hr} />
            <Text style={{ ...heading, color: "#000" }}>
              Thank you for your order.
            </Text>
            <Text style={paragraph}>Hi {username},</Text>
            <Text style={paragraph}>
              We are excited to let you know that your order #{orderId} has been
              successfully placed.
              <br />
              {orderType === "DELIVERY"
                ? "Our team is now processing your order and you will receive a notification once it has been shipped."
                : `Your order is will be ready for pickup on ${orderDetails.oneTimeOrder?.orderDate}.`}
            </Text>
            {kitchenInfo && orderType === "PICKUP" && (
              <Text>
                Pickup Address:
                <br />
                {kitchenInfo?.name}, {kitchenInfo?.address},<br />
                {kitchenInfo?.phone}, {kitchenInfo?.email}
              </Text>
            )}
            {/* <Section className="py-[16px] text-center">
              <Text>Your Order Details</Text>
              <Section className="m-[16px] rounded-[8px] border border-solid border-gray-200 p-[16px] pt-0">
                <table className="mb-4" width="100%">
                  <tr>
                    <th
                      align="left"
                      className="border-0 border-b border-solid border-gray-200 py-[1px] font-bold text-gray-500"
                      colSpan={6}
                    >
                      <Text className="font-semibold">Item</Text>
                    </th>
                    <th
                      align="center"
                      className="border-0 border-b border-solid border-gray-200 py-[1px] font-bold text-gray-500"
                    >
                      <Text className="font-semibold">Quantity</Text>
                    </th>
                    <th
                      align="center"
                      className="border-0 border-b border-solid border-gray-200 py-[1px] font-bold text-gray-500"
                    >
                      <Text className="font-semibold">Price</Text>
                    </th>
                  </tr>
                  {orderDetails.items && orderDetails.items.map((item, index) => (
                    <tr key={item.itemName}>
                      <td
                        align="left"
                        className="border-0 border-b border-solid border-gray-200 py-[1px]"
                        colSpan={6}
                      >
                        <Text>{item.itemName}</Text>
                      </td>
                      <td
                        align="center"
                        className="border-0 border-b border-solid border-gray-200 py-[1px]"
                      >
                        <Text>{item.quantity}</Text>
                      </td>
                      <td
                        align="center"
                        className="border-0 border-b border-solid border-gray-200 py-[1px]"
                      >
                        <Text>${item.price}</Text>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td
                      align="left"
                      className="border-0 border-b border-solid border-gray-200 py-[1px]"
                      colSpan={6}
                    >
                      <Text>Tax{orderDetails.taxRate}</Text>
                    </td>
                    <td
                      align="center"
                      className="border-0 border-b border-solid border-gray-200 py-[1px]"
                    >
                      &nbsp;
                    </td>
                    <td
                      align="center"
                      className="border-0 border-b border-solid border-gray-200 py-[1px]"
                    >
                      <Text>${orderDetails.taxAmount.toFixed(2)}</Text>
                    </td>
                  </tr>

                  <tr>
                    <td
                      align="left"
                      className="border-0 border-b border-solid border-gray-200 py-[8px]"
                      colSpan={6}
                    >
                      <Text>Total</Text>
                    </td>
                    <td
                      align="center"
                      className="border-0 border-b border-solid border-gray-200 py-[8px]"
                    >
                      <Text>{orderDetails.items && orderDetails.items.length}</Text>
                    </td>
                    <td
                      align="center"
                      className="border-0 border-b border-solid border-gray-200 py-[8px]"
                    >
                      <Text>${orderDetails.totalAmount}</Text>
                    </td>
                  </tr>
                </table>
              </Section>
            </Section> */}

            <Text style={paragraph}>
              For any queries or cancellations, please contact us at{" "}
              <a
                style={{ color: "#007A4D" }}
                href="mailto:support@dabbahwala.com"
              >
                support@dabbahwala.com
              </a>
            </Text>
          </Section>

          <Section style={paragraphContent}>
            <Text style={{ fontSize: "14px", marginBottom: "-10px" }}>
              Thank you,
            </Text>
            <Text style={{ fontSize: "14px" }}>The Dabbahwala team</Text>
          </Section>

          <Section style={{ ...paragraphContent, paddingBottom: 25 }}>
            <Text
              style={{
                ...paragraph,
                fontSize: "12px",
                textAlign: "center",
                margin: 0,
                marginTop: "15px",
              }}
            >
              © 2024 Dabbahwala - All rights reserved - 123 New York, NY 10001
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#007A4D",
  padding: "20px",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
};
const sectionLogo = {
  padding: "0 40px",
  marginTop: "10px",
  marginBottom: "-10px",
};

const container = {
  margin: "30px auto",
  backgroundColor: "#fff",
  borderRadius: 5,
  overflow: "hidden",
};

const heading = {
  fontSize: "18px",
  lineHeight: "26px",
  fontWeight: "700",
  color: "#007A4D",
};

const paragraphContent = {
  padding: "0 40px",
};

const paragraph = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#3c4043",
};

const hr = {
  borderColor: "#e8eaed",
  margin: "20px 0",
};
