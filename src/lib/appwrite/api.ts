import { ID, Query } from "appwrite";
import { IUpdatePost, INewPost, INewUser, IUpdateUser } from "@/types";
import { appwriteConfig, account, databases, storage, avatars } from "./config";

// Singleton for Appwrite Configuration
class AppwriteConfig {
  private static instance: AppwriteConfig;
  public databaseId: string;
  public userCollectionId: string;
  public postCollectionId: string;
  public storageId: string;
  public savesCollectionId: string;

  private constructor() {
    this.databaseId = appwriteConfig.databaseId;
    this.userCollectionId = appwriteConfig.userCollectionId;
    this.postCollectionId = appwriteConfig.postCollectionId;
    this.storageId = appwriteConfig.storageId;
    this.savesCollectionId = appwriteConfig.savesCollectionId;
  }

  public static getInstance(): AppwriteConfig {
    if (!AppwriteConfig.instance) {
      AppwriteConfig.instance = new AppwriteConfig();
    }
    return AppwriteConfig.instance;
  }
}

// Factory for User and Post Creation
export class EntityFactory {
  static createNewUser(data: INewUser): INewUser {
    if (!data.name || !data.email || !data.password) {
      throw new Error("Missing required user information");
    }

    const newUser: INewUser = {
      ...data,
      username: data.username || this.generateUsername(data.name),
    };

    newUser.name = newUser.name.trim();
    newUser.email = newUser.email.trim().toLowerCase();

    return newUser;
  }

  static createNewPost(data: INewPost): INewPost {
    if (!data.userId || !data.caption || !data.file.length) {
      throw new Error("Missing required post information");
    }

    // Convert tags from a comma-separated string to an array of strings
    const tagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim()) : [];

    const newPost: INewPost = {
      ...data,
      tags: tagsArray.join(', '), // Convert back to a string if needed
    };

    newPost.caption = newPost.caption.trim();

    return newPost;
  }

  private static generateUsername(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '_') + Math.floor(Math.random() * 1000).toString();
  }
}

// Repository for User Data Access - MVC
class UserRepository {
  private config = AppwriteConfig.getInstance();

  async saveUserToDB(user: {
    accountId: string;
    email: string;
    name: string;
    imageUrl: URL;
    username?: string;
  }) {
    try {
      const newUser = await databases.createDocument(
        this.config.databaseId,
        this.config.userCollectionId,
        ID.unique(),
        user
      );
      return newUser;
    } catch (error) {
      console.log(error);
    }
  }

  async getUserById(userId: string) {
    try {
      const user = await databases.getDocument(
        this.config.databaseId,
        this.config.userCollectionId,
        userId
      );
      if (!user) throw Error;
      return user;
    } catch (error) {
      console.log(error);
    }
  }

  async getUsers(limit?: number) {
    const queries: any[] = [Query.orderDesc("$createdAt")];
    if (limit) {
      queries.push(Query.limit(limit));
    }
    try {
      const users = await databases.listDocuments(
        this.config.databaseId,
        this.config.userCollectionId,
        queries
      );
      if (!users) throw Error;
      return users;
    } catch (error) {
      console.log(error);
    }
  }
}

// Repository for Post Data Access
class PostRepository {
  private config = AppwriteConfig.getInstance();

  async createPost(post: INewPost) {
    try {
      const uploadedFile = await uploadFile(post.file[0]);
      if (!uploadedFile) throw Error;

      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      const tags = post.tags?.replace(/ /g, "").split(",") || [];

      const newPost = await databases.createDocument(
        this.config.databaseId,
        this.config.postCollectionId,
        ID.unique(),
        {
          creator: post.userId,
          caption: post.caption,
          imageUrl: fileUrl,
          imageId: uploadedFile.$id,
          location: post.location,
          tags: tags,
        }
      );

      if (!newPost) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      return newPost;
    } catch (error) {
      console.log(error);
    }
  }

  async getPostById(postId?: string) {
    if (!postId) throw Error;
    try {
      const post = await databases.getDocument(
        this.config.databaseId,
        this.config.postCollectionId,
        postId
      );
      if (!post) throw Error;
      return post;
    } catch (error) {
      console.log(error);
    }
  }

  async searchPosts(searchTerm: string) {
    try {
      const posts = await databases.listDocuments(
        this.config.databaseId,
        this.config.postCollectionId,
        [Query.search("caption", searchTerm)]
      );
      if (!posts) throw Error;
      return posts;
    } catch (error) {
      console.log(error);
    }
  }

  async getInfinitePosts({ pageParam }: { pageParam: number }) {
    const queries: any[] = [Query.orderDesc("$updatedAt"), Query.limit(9)];
    if (pageParam) {
      queries.push(Query.cursorAfter(pageParam.toString()));
    }
    try {
      const posts = await databases.listDocuments(
        this.config.databaseId,
        this.config.postCollectionId,
        queries
      );
      if (!posts) throw Error;
      return posts;
    } catch (error) {
      console.log(error);
    }
  }

  async updatePost(post: IUpdatePost) {
    const hasFileToUpdate = post.file.length > 0;
    try {
      let image = {
        imageUrl: post.imageUrl,
        imageId: post.imageId,
      };

      if (hasFileToUpdate) {
        const uploadedFile = await uploadFile(post.file[0]);
        if (!uploadedFile) throw Error;

        const fileUrl = getFilePreview(uploadedFile.$id);
        if (!fileUrl) {
          await deleteFile(uploadedFile.$id);
          throw Error;
        }

        image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
      }

      const tags = post.tags?.replace(/ /g, "").split(",") || [];

      const updatedPost = await databases.updateDocument(
        this.config.databaseId,
        this.config.postCollectionId,
        post.postId,
        {
          caption: post.caption,
          imageUrl: image.imageUrl,
          imageId: image.imageId,
          location: post.location,
          tags: tags,
        }
      );

      if (!updatedPost) {
        if (hasFileToUpdate) {
          await deleteFile(image.imageId);
        }
        throw Error;
      }

      if (hasFileToUpdate) {
        await deleteFile(post.imageId);
      }

      return updatedPost;
    } catch (error) {
      console.log(error);
    }
  }

  async deletePost(postId?: string, imageId?: string) {
    if (!postId || !imageId) return;
    try {
      const statusCode = await databases.deleteDocument(
        this.config.databaseId,
        this.config.postCollectionId,
        postId
      );
      if (!statusCode) throw Error;
      await deleteFile(imageId);
      return { status: "Ok" };
    } catch (error) {
      console.log(error);
    }
  }

  async likePost(postId: string, likesArray: string[]) {
    try {
      const updatedPost = await databases.updateDocument(
        this.config.databaseId,
        this.config.postCollectionId,
        postId,
        {
          likes: likesArray,
        }
      );
      if (!updatedPost) throw Error;
      return updatedPost;
    } catch (error) {
      console.log(error);
    }
  }

  async getUserPosts(userId?: string) {
    if (!userId) return;
    try {
      const post = await databases.listDocuments(
        this.config.databaseId,
        this.config.postCollectionId,
        [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
      );
      if (!post) throw Error;
      return post;
    } catch (error) {
      console.log(error);
    }
  }

  async getRecentPosts() {
    try {
      const posts = await databases.listDocuments(
        this.config.databaseId,
        this.config.postCollectionId,
        [Query.orderDesc("$createdAt"), Query.limit(20)]
      );
      if (!posts) throw Error;
      return posts;
    } catch (error) {
      console.log(error);
    }
  }
}

// AUTH FUNCTIONS
export async function createUserAccount(user: INewUser) {
  const userRepository = new UserRepository();
  try {
    const newAccount = await account.create(
      ID.unique(),
      user.email,
      user.password,
      user.name
    );

    if (!newAccount) throw Error;

    const avatarUrl = avatars.getInitials(user.name);

    const newUser = await userRepository.saveUserToDB({
      accountId: newAccount.$id,
      name: newAccount.name,
      email: newAccount.email,
      username: user.username,
      imageUrl: avatarUrl,
    });

    return newUser;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function signInAccount(user: { email: string; password: string }) {
  try {
    const session = await account.createEmailSession(user.email, user.password);
    return session;
  } catch (error) {
    console.log(error);
  }
}

export async function getAccount() {
  try {
    const currentAccount = await account.get();
    return currentAccount;
  } catch (error) {
    console.log(error);
  }
}

export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();
    if (!currentAccount) throw new Error("No current account found");

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (!currentUser || currentUser.documents.length === 0) throw new Error("User not found");

    return currentUser.documents[0];
  } catch (error) {
    console.log(error);
    return null;
  }
}
export async function signOutAccount() {
  try {
    const session = await account.deleteSession("current");
    return session;
  } catch (error) {
    console.log(error);
  }
}

// POST FUNCTIONS
export async function createPost(post: INewPost) {
  const postRepository = new PostRepository();
  return postRepository.createPost(post);
}

export async function uploadFile(file: File) {
  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );
    return uploadedFile;
  } catch (error) {
    console.log(error);
  }
}

export function getFilePreview(fileId: string) {
  try {
    const fileUrl = storage.getFilePreview(
      appwriteConfig.storageId,
      fileId,
      2000,
      2000,
      "top",
      100
    );
    if (!fileUrl) throw Error;
    return fileUrl;
  } catch (error) {
    console.log(error);
  }
}

export async function deleteFile(fileId: string) {
  try {
    await storage.deleteFile(appwriteConfig.storageId, fileId);
    return { status: "ok" };
  } catch (error) {
    console.log(error);
  }
}

export async function searchPosts(searchTerm: string) {
  const postRepository = new PostRepository();
  return postRepository.searchPosts(searchTerm);
}

export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
  const postRepository = new PostRepository();
  return postRepository.getInfinitePosts({ pageParam });
}

export async function getPostById(postId?: string) {
  const postRepository = new PostRepository();
  return postRepository.getPostById(postId);
}

export async function updatePost(post: IUpdatePost) {
  const postRepository = new PostRepository();
  return postRepository.updatePost(post);
}

export async function deletePost(postId?: string, imageId?: string) {
  const postRepository = new PostRepository();
  return postRepository.deletePost(postId, imageId);
}

export async function likePost(postId: string, likesArray: string[]) {
  const postRepository = new PostRepository();
  return postRepository.likePost(postId, likesArray);
}

export async function savePost(userId: string, postId: string) {
  try {
    const updatedPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      ID.unique(),
      {
        user: userId,
        post: postId,
      }
    );

    if (!updatedPost) throw new Error('Failed to save post');

    return updatedPost;
  } catch (error) {
    console.error('Error saving post:', error);
    throw error;
  }
}

export async function deleteSavedPost(savedRecordId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      savedRecordId
    );

    return { status: "Ok" };
  } catch (error) {
    console.error('Error deleting saved post:', error);
    throw error;
  }
}

export async function getUserPosts(userId?: string) {
  const postRepository = new PostRepository();
  return postRepository.getUserPosts(userId);
}

export async function getRecentPosts() {
  const postRepository = new PostRepository();
  return postRepository.getRecentPosts();
}

// USER FUNCTIONS
export async function getUsers(limit?: number) {
  const userRepository = new UserRepository();
  return userRepository.getUsers(limit);
}

export async function getUserById(userId: string) {
  const userRepository = new UserRepository();
  return userRepository.getUserById(userId);
}

export async function updateUser(user: IUpdateUser) {
  const hasFileToUpdate = user.file.length > 0;
  try {
    let image = {
      imageUrl: user.imageUrl,
      imageId: user.imageId,
    };

    if (hasFileToUpdate) {
      const uploadedFile = await uploadFile(user.file[0]);
      if (!uploadedFile) throw new Error("File upload failed");

      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw new Error("Failed to get file URL");
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.userId,
      {
        name: user.name,
        bio: user.bio,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
      }
    );

    if (!updatedUser) {
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }
      throw new Error("Failed to update user");
    }

    if (user.imageId && hasFileToUpdate) {
      await deleteFile(user.imageId);
    }

    return updatedUser;
  } catch (error) {
    console.log(error);
  }
}