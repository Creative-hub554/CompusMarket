import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreatePostDto, PostMediaInputDto } from "./social.dto";

function media(n: number): PostMediaInputDto[] {
  return Array.from({ length: n }, (_, i) => ({
    url: `obj-${i}.webp`,
    kind: "IMAGE" as const,
    position: i,
  }));
}

describe("CreatePostDto media validation", () => {
  it("accepts a multi-photo post up to the 8-photo limit", async () => {
    const dto = plainToInstance(CreatePostDto, {
      content: "two photos",
      media: media(2),
    });
    const errors = await validate(dto);
    expect(errors).toEqual([]);
  });

  it("rejects more than 8 photos", async () => {
    const dto = plainToInstance(CreatePostDto, {
      content: "too many",
      media: media(9),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("media");
    expect(Object.values(errors[0].constraints ?? {})).toContain(
      "media must contain no more than 8 elements",
    );
  });
});
