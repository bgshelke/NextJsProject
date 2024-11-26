import { UserSelectedPlan } from "@/types/main";
import {
    Body,
    Container,
    Column,
    Head,
    Hr,
    Html,
    Img,
    Preview,
    Row,
    Section,
    Text,
  } from "@react-email/components";
  import * as React from "react";

  
  const baseUrl = process.env.NEXT_PUBLIC_URL;
  
  export default function SubscriptionTemplate({
    orderId,
    username,
    orderDetails,
    nextPaymentDate,
    totalAmount,
  }: {
    orderId: string;
    username: string;
    orderDetails: UserSelectedPlan;
    nextPaymentDate: string;
    totalAmount: number;
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
                Your subscription has been created.
              </Text>
              <Text style={paragraph}>Hi {username},</Text>
              <Text style={paragraph}>
                Your subscription has been created successfully.
                <br />
                Your next payment will be on {nextPaymentDate}.
                <br />
                <br />
                Click here to view your subscription details:{" "}
                <a
                  style={{ color: "#007A4D" }}
                  href={`${baseUrl}/my-subscription`}
                >
                  My Subscription
                </a>
              </Text>
  
              {/* <Section className="py-[16px] text-center">
                <Text>Your Subscription Details</Text>
                <Section className="m-[16px] rounded-[8px] border border-solid border-gray-200 p-[16px] pt-0">
                  <table className="mb-4" width="100%">
                    <tr>
                      <td
                        align="left"
                        className="border-0 border-b border-solid border-gray-200 py-[1px]"
                        colSpan={6}
                      >
                        <Text>Days Selected</Text>
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
                        <Text>
                          {orderDetails?.subscriptionOrder?.subscriptionDays
                            .map((day: SubscriptionDay) =>
                              new Date(day.date).toLocaleDateString("en-US", {
                                weekday: "long",
                              })
                            )
                            .join(", ")}
                        </Text>
                      </td>
                    </tr>
                    <tr>
                      <td
                        align="left"
                        className="border-0 border-b border-solid border-gray-200 py-[1px]"
                        colSpan={6}
                      >
                        <Text>Tax{"(" + orderDetails.taxRate + "%)"}</Text>
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
                        <Text>${orderDetails.taxAmount}</Text>
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
                        <Text>${totalAmount}</Text>
                      </td>
                    </tr>
                  </table>
                </Section>
              </Section> */}
  
              <Text style={paragraph}>
                For any queries, please contact us at{" "}
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
  