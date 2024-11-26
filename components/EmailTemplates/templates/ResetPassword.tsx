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
  type ResetPassword = {
    resetLink?: string;
    type: "RESET" | "CHANGE";
  };
  const baseUrl = process.env.NEXT_PUBLIC_URL;
  
  export default function ResetPassword({ resetLink, type }: ResetPassword) {
    return (
      <Html>
        <Head />
        <Preview>Reset your password</Preview>
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
                {type === "RESET" ? "Password Reset Request" : "Password Changed"}
              </Text>
  
              <Text>
                {type === "RESET"
                  ? "You have requested to reset your password. Please click the link below to reset your password."
                  : "Your password has been updated. If you did not request this change, please contact support."}
              </Text>
              <Link href={resetLink} style={{ color: "#007A4D" }}>
                Reset Password
              </Link>
            </Section>
  
            <Section style={paragraphContent}>
              <Text style={{ ...paragraph, color: "#000" }}>
                {type === "RESET" && "Link will expire in 1 hour."}
              </Text>
            </Section>
  
            <Section style={paragraphContent}>
              <Text style={{ ...paragraph, color: "#000" }}>
                {type === "RESET" &&
                  "If you did not request a password reset, please ignore this email."}
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
  