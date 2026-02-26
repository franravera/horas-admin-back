import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";

import * as csurf from "csurf";
import helmet from "helmet";

import { join } from "path";
import { NestExpressApplication } from "@nestjs/platform-express";

async function bootstrap() {
  // process.env.TZ = 'America/Argentina/Buenos_Aires';

  
  const fs = require("fs");
  // const keyFile = fs.readFileSync(__dirname + "/../ssl/private.pem");
  // const certFile = fs.readFileSync(__dirname + "/../ssl/certificado.pem");

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: ['https://adm-consorcio.com',
      "https://consorciofront.onrender.com",  // dominio del frontend en producción
      "http://localhost:3000",                // para desarrollo local
      "http://localhost:4200",
      "http://localhost:5173"
    ],
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Origin,X-Requested-With,Content-Type,Accept,Authorization",
  });

  const logger = new Logger("Bootstrap");

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    })
  );

  // Servir archivos estáticos para Swagger
  app.useStaticAssets(join(__dirname, "..", "src"));
  app.useStaticAssets(
    join(process.cwd(), process.env.FILES_UPLOADS || "static/uploads"),
    { prefix: "/uploads" },
  );

  const config = new DocumentBuilder()
    .setTitle("Carrito")
    .setDescription("E-commerce")
    .setVersion("0.0.1")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document, {
    swaggerOptions: {
      displayRequestDuration: true,
      filter: true,
    },
    customCssUrl: "/custom.css",
    customSiteTitle: "Consorcio Admin",
  });

  app.getHttpAdapter().getInstance().disable("x-powered-by");

  // app.use(csurf());

  app.use(
    helmet({
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
      referrerPolicy: {
        policy: ["origin"],
      },
      strictTransportSecurity: {
        maxAge: 31536000,
      },
      xPoweredBy: false,
      xXssProtection: true,
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'", "https://consorciofront.onrender.com", "'unsafe-inline'", "data:"],
          "media-src": ["'self'", "data:", "'unsafe-inline'"],
          "img-src": ["'self'", "data:"],
          "script-src": ["'self'", "'unsafe-inline'", "https://consorciofront.onrender.com"],
          "script-src-attr": ["'self'", "'unsafe-inline'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "connect-src": ["'self'", "https://consorciofront.onrender.com"],
        },
      },
    })
  );

  await app.listen(process.env.PORT);
  logger.log(`App running on port ${process.env.PORT}`);
}
bootstrap();
