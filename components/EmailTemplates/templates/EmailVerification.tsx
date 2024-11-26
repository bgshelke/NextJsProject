import {
  Column,
  Preview,
  Section,
  Hr,
  Text,
  Html,
  Head,
  Body,
  Row,
  Img,
  Heading,
} from "@react-email/components";
import { Container } from "@react-email/components";
import React from "react";
import {
  main,
  container,
  sectionLogo,
  paragraphContent,
  heading,
  paragraph,
  hr,
  baseUrl,
  contactEmail,
} from "../emailHelper";

type VerificationCode = {
  username: string;
  code: string;
};

function EmailVerification({ username, code }: VerificationCode) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ marginTop: "10px" }}>
            <Row>
              <Column>
                <Img
                  style={sectionLogo}
                  src={`${baseUrl}/assets/images/png/logo.png`}
                  width="70"
                  height="55"
                  alt="Dabbahwala"
                />
              </Column>
            </Row>
          </Section>

          <Section style={paragraphContent}>
            <Hr style={hr} />
            <Text style={{ ...heading, color: "#000" }}>
              Verify your email address
            </Text>
            <Text style={paragraph}>Hi {username},</Text>
            <Text style={paragraph}>
              Welcome to Dabbahwala. Please verify your email address by using
              the verification code provided. If you did not sign up for an
              account, please ignore this email.
            </Text>
            <Text style={paragraph}>
              <strong>Verification Code:</strong>
            </Text>

            <Heading as="h3" style={{ fontSize: "24px", fontWeight: "bold" }}>
              {code}
            </Heading>

            <Text style={paragraph}>
              For any queries, please contact us at{" "}
              <a style={{ color: "#007A4D" }} href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            </Text>
          </Section>

          <Section style={paragraphContent}>
            <Text style={{ fontSize: "14px", marginBottom: "-10px" }}>
              Thank you,
            </Text>
            <Text style={{ fontSize: "14px" }}>The Dabbahwala Team</Text>
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
              © {new Date().getFullYear()} Dabbahwala - All rights reserved -
              123 New York, NY 10001
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default EmailVerification;
