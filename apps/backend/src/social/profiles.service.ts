import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/social.dto";

const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  username: true,
  image: true,
  coverImage: true,
  bio: true,
  accountPrivate: true,
  theme: true,
  autoReplyEnabled: true,
  autoReplyText: true,
  createdAt: true,
  _count: { select: { posts: true, followers: true, following: true } },
};

const ALBUM_SELECT = {
  id: true,
  title: true,
  description: true,
  createdAt: true,
  images: {
    orderBy: { position: "asc" as const },
    select: { id: true, url: true, position: true },
  },
};

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async listAlbums(ownerId: string, viewerId?: string) {
    if (viewerId !== ownerId) {
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { accountPrivate: true },
      });
      if (!owner || owner.accountPrivate) return [];
    }

    return this.prisma.profileAlbum.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      select: ALBUM_SELECT,
    });
  }

  async createAlbum(ownerId: string, title: string, description?: string) {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) throw new BadRequestException("Album title is required");
    return this.prisma.profileAlbum.create({
      data: {
        ownerId,
        title: normalizedTitle,
        description: description?.trim() || null,
      },
      select: ALBUM_SELECT,
    });
  }

  async deleteAlbum(ownerId: string, albumId: string) {
    const album = await this.prisma.profileAlbum.findFirst({
      where: { id: albumId, ownerId },
      select: { id: true },
    });
    if (!album) throw new NotFoundException("Album not found");
    await this.prisma.profileAlbum.delete({ where: { id: albumId } });
    return { deleted: true };
  }
  async addAlbumImage(ownerId: string, albumId: string, url: string) {
    const album = await this.prisma.profileAlbum.findFirst({
      where: { id: albumId, ownerId },
      select: { id: true },
    });
    if (!album) throw new NotFoundException("Album not found");

    const last = await this.prisma.profileAlbumImage.findFirst({
      where: { albumId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    return this.prisma.profileAlbumImage.create({
      data: { albumId, url, position: (last?.position ?? -1) + 1 },
      select: { id: true, url: true, position: true },
    });
  }

  async getProfile(profileId: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: profileId },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException("User not found");

    const isFollowing =
      viewerId && viewerId !== user.id
        ? await this.prisma.follow
            .findUnique({
              where: { followerId_followingId: { followerId: viewerId, followingId: profileId } },
              select: { followerId: true },
            })
            .then((r) => !!r)
        : false;

    const followRequested =
      viewerId &&
      viewerId !== user.id &&
      user.accountPrivate &&
      !isFollowing
        ? await this.prisma.followRequest
            .findUnique({
              where: {
                followerId_followingId: { followerId: viewerId, followingId: profileId },
              },
              select: { status: true },
            })
            .then((r) => r?.status === "PENDING")
        : false;

    const canSeePostCount =
      !user.accountPrivate || viewerId === user.id || isFollowing;
    const albums = await this.listAlbums(profileId, viewerId);

    return {
      ...user,
      albums,
      isFollowing,
      followRequested,
      ...(canSeePostCount ? {} : { _count: { ...user._count, posts: 0 } }),
    };
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
        ...(dto.accountPrivate !== undefined ? { accountPrivate: dto.accountPrivate } : {}),
        ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
        ...(dto.autoReplyEnabled !== undefined ? { autoReplyEnabled: dto.autoReplyEnabled } : {}),
        ...(dto.autoReplyText !== undefined ? { autoReplyText: dto.autoReplyText } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        coverImage: true,
        bio: true,
        accountPrivate: true,
        theme: true,
        autoReplyEnabled: true,
        autoReplyText: true,
      },
    });
  }
}
