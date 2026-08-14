import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { Prisma } from "@theo/database";

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Pass through NestJS exceptions (validation, auth, guards, service errors)
    // so their status codes and messages are preserved.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(
        typeof body === "string" ? { statusCode: status, message: body } : body,
      );
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case "P2002":
          // Unique constraint violation
          status = HttpStatus.CONFLICT;
          message = "A record with that value already exists";
          break;
        case "P2025":
          // Record not found
          status = HttpStatus.NOT_FOUND;
          message = "Record not found";
          break;
        case "P2003":
          // Foreign key constraint violation
          status = HttpStatus.BAD_REQUEST;
          message = "Invalid request data";
          break;
        case "P2000":
          // Value too long for column
          status = HttpStatus.BAD_REQUEST;
          message = "Invalid request data";
          break;
        default:
          // Never leak the internal Prisma error/message to the client.
          break;
      }
    }

    response.status(status).json({ statusCode: status, message });
  }
}
