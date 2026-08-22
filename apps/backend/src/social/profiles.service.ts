import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/social.dto";

const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  username: true,
  image: true,
  coverImage: true,
  bio: true,
  createdAt: true,
  _count: { select: { posts: true, followers: true, following: true } },
};

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async getProfile(profileId: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: profileId },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException("User not found");

    const isFollowing = viewerId
      ? await this.prisma.follow
          .findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: profileId } },
            select: { followerId: true },
          })
          .then((r) => !!r)
      : false;

    return { ...user, isFollowing };
  }

  async getProfileByUsername(username: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return this.getProfile(user.id, viewerId);
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    if (dto.username !== undefined) {
      const taken = await this.prisma.user.findFirst({
        where: { username: dto.username, id: { not: userId } },
        select: { id: true },
      });
      if (taken) throw new ConflictException("Username already taken");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.username !== undefined ? { username: dto.username } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.image !== undefined ? { image: dto.image } : {}),
        ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        coverImage: true,
        bio: true,
      },
    });
  }
}
