"use client";

import {
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { SignUp } from "@clerk/nextjs";
import { Alert, Card, Col, Descriptions, Row, Space, Tag, Typography } from "antd";
import { useSearchParams } from "next/navigation";

const { Paragraph: TypographyParagraph, Title: TypographyTitle } = Typography;

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();

  const labName = searchParams.get("lab_name") ?? "";
  const labId = searchParams.get("lab_id") ?? "";

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl items-center">
        <Row gutter={[24, 24]} align="middle" className="w-full">
          <Col xs={24} lg={11}>
            <Card variant="borderless">
              <Space orientation="vertical" size={18} style={{ width: "100%" }}>
                <Space orientation="vertical" size={4}>
                  <Tag color="green" variant="filled">
                    Undangan aktif
                  </Tag>
                  <TypographyTitle level={2} style={{ margin: 0 }}>
                    Aktivasi akun Labkesda
                  </TypographyTitle>
                  <TypographyParagraph
                    style={{ margin: 0, color: "#64748b" }}
                  >
                    Buat password pertama untuk menyelesaikan aktivasi akun yang
                    diundang melalui email.
                  </TypographyParagraph>
                </Space>

                <Alert
                  type="success"
                  showIcon
                  title="Pendaftaran umum ditutup"
                  description="Halaman ini hanya berfungsi untuk email yang menerima invitation resmi dari admin."
                />

                <Descriptions
                  size="small"
                  column={1}
                  bordered
                  items={[
                    {
                      key: "lab",
                      label: "Laboratorium",
                      children: labName || "-",
                    },
                    {
                      key: "lab-id",
                      label: "ID Lab",
                      children: labId || "-",
                    },
                    {
                      key: "akses",
                      label: "Akses",
                      children: (
                        <Space wrap size={[8, 8]}>
                          <Tag icon={<UserOutlined />} color="green">
                            Lab Admin
                          </Tag>
                          <Tag icon={<SafetyCertificateOutlined />} color="blue">
                            Invite-only
                          </Tag>
                          <Tag icon={<MailOutlined />} color="blue">
                            Email verified via invitation
                          </Tag>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={13}>
            <Card variant="borderless">
              <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                <div>
                  <TypographyTitle level={3} style={{ marginBottom: 4 }}>
                    Buat password akun
                  </TypographyTitle>
                  <TypographyParagraph
                    style={{ marginBottom: 0, color: "#64748b" }}
                  >
                    Setelah selesai, Anda akan diarahkan ke dashboard untuk
                    mengelola data laboratorium yang ditautkan ke akun ini.
                  </TypographyParagraph>
                </div>

                <div className="smartmaps-clerk">
                  <SignUp
                    routing="path"
                    path="/accept-invitation"
                    forceRedirectUrl="/admin"
                    fallbackRedirectUrl="/admin"
                    signInUrl="/login"
                  />
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </main>
  );
}
