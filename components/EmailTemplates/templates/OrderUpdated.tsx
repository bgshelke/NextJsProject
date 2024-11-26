import { UserSelectedPlan } from "@/types/main";
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
} from "@react-email/components";
import * as React from "react";

const baseUrl = process.env.NEXT_PUBLIC_URL;

export default function OrderUpdatedTemplate({
  orderId,
  username,
  type,
}: {
  orderId: string;
  username: string;
  type: "ADDONS" | "ADD_DAY" | "SWITCH_DAY" | "UNSKIP" | "SKIP";
}) {
  return (
    <Html>
      <Head />
      <Preview>Your order has been updated</Preview>
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
              Your order has been updated.
            </Text>
            <Text style={paragraph}>Hi {username},</Text>
            <Text style={paragraph}>
              {type === "ADDONS"
                ? "Your order has been updated. Items have been added to your order."
                : type === "ADD_DAY"
                ? "Your order has been updated. A day has been added to your order."
                : type === "UNSKIP"
                ? "Your order has been updated. The date of your order has been unskipped."
                : type === "SKIP"
                ? "Your order has been updated. The date of your order has been skipped."
                : ""}
              <br />
              {type === "SKIP" &&
                "The amount has been credited to your wallet."}
              {type === "UNSKIP" &&
                "The amount has been debited from your wallet."}
              Click here to view your order details:{" "}
              <a
                style={{ color: "#007A4D" }}
                href={`${baseUrl}/my-subscription`}
              >
                My Order
              </a>
            </Text>

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
