import { ID, Query } from "appwrite";
import { INewPost, INewUser, IUpdatePost, IUpdateUser } from "@/types";
import { account, appwriteConfig, avatars, databases, storage } from "./config";

// Creating a new user
export async function createUserAccount(user: INewUser) {
    try {
        const newAccount = await account.create(
            ID.unique(),
            user.email,
            user.password,
            user.name,
        );

        if (!newAccount) throw Error;

        const avatarUrl = avatars.getInitials(user.name);

        const newUser = await saveUserToDB({
            accountId: newAccount.$id,
            name: newAccount.name,
            email: newAccount.email,
            username: user.username,
            imageUrl: avatarUrl
        });

        return newUser;
    }
    catch (error) {
        console.log(error);
        return error;
    }
}

// Save User to the Database
export async function saveUserToDB(user: {
    accountId: string;
    email: string;
    name: string;
    imageUrl: URL;
    username?: string;
}) {
    try {
        const newUser = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            user
        );
        return newUser;
    }
    catch (error) {
        console.log(error)
    }
}

// Sign In
export async function signInAccount(user: {
    email: string;
    password: string
}) {
    try {
        const session = await account.createEmailPasswordSession(user.email, user.password);
        return session;
    }
    catch (error) {
        console.log(error);
    }
}

// Getting the logged in user
export async function getCurrentUser() {
    try {
        const currentAccount = await account.get();

        if (!currentAccount) throw Error;

        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('accountId', currentAccount.$id)]
        );

        if (!currentUser) throw Error;
        
        return currentUser.documents[0];

    }
    catch (error) {
        console.log(error);
    }
}

// Signing out the current user
export async function signOutAccount() {
    try {
        const session = await account.deleteSession("current");
        return session;
    }
    catch (error) {
        console.log(error)
    }
}

// Creating a new Post
export async function createPost(post: INewPost) {
    try {
        const uploadedFile = await uploadFile(post.file[0]);
        if (!uploadedFile) throw Error;

        // Get file url
        const fileUrl = getFilePreview(uploadedFile.$id);
        if (!fileUrl) {
            await deleteFile(uploadedFile.$id);
            throw Error;
        }

        // Convert tags into the array
        const tags = post.tags?.replace(/ /g, "").split(",") || [];

        // Saving post to the database
        const newPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            ID.unique(),
            {
                creator: post.userId,
                caption: post.caption,
                imageUrl: fileUrl,
                imageId: uploadedFile.$id,
                location: post.location,
                tags: tags
            }
        );
        if(!newPost) {
            await deleteFile(uploadedFile.$id);
            throw Error;
        }
        return newPost;
    }
    catch (error) {
        console.log(error)
    } 
}

// Uploading a file
export async function uploadFile(file: File) {
    try {
        const uploadedFile = await storage.createFile(
            appwriteConfig.storageId,
            ID.unique(),
            file
        );
        return uploadedFile;
    }
    catch (error) {
        console.log(error)
    }
}

// Getting a preview of a file
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
    }
    catch (error) {
        console.log(error);
    }
}

// Deleting a file
export async function deleteFile(fileId: string) {
    try {
        await storage.deleteFile(appwriteConfig.storageId, fileId);
        return { status : "ok"};
    }
    catch (error) {
        console.log(error);
    }
}

// Like a post
export async function likePost(postId: string, likesArray: string[]) {
    try {
        const updatedPost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId, {
                likes: likesArray
            }
        );
        if (!updatedPost) throw Error;
        return updatedPost;
    }
    catch(error) {
        console.log(error)
    }
}

// Save a post
export async function savePost(userId: string, postId: string) {
    try {
        const updatedPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            ID.unique(), {
                user: userId,
                post: postId
            }
        );

        if (!updatedPost) throw Error;
        return updatedPost;
    }
    catch(error) {
        console.log(error)
    }
}

// Delete a post
export async function deleteSavedPost(savedRecordId: string) {
    try {
        const statusCode = await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            savedRecordId
        );

        if (!statusCode) throw Error;
        return { status: "Ok" };
    }
    catch(error) {
        console.log(error)
    }
}

// Get Post by the id
export async function getPostById(postId?: string) {
    if (!postId) throw Error;

    try {
        const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId
        );

        if (!post) throw Error;

        return post;
    }
    catch (error) {
        console.log(error);
    }
}

// Updating any post
export async function updatePost(post: IUpdatePost) {
    const hasFileToUpdate = post.file.length > 0;

    try {
        let image = {
            imageUrl: post.imageUrl,
            imageId: post.imageId,
        }
        if (hasFileToUpdate) {
            const uploadedFile = await uploadFile(post.file[0]);
            
            if(!uploadedFile) throw Error;

            const fileUrl = getFilePreview(uploadedFile.$id);
            if(!fileUrl) {
                await deleteFile(uploadedFile.$id);
                throw Error;
            }
            image = {...image, imageUrl: fileUrl, imageId: uploadedFile.$id};
        }

        const tags = post.tags?.replace(/ /g, "").split(",") || [];

        const updatedPost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            post.postId,
            {
                caption: post.caption,
                imageUrl: image.imageUrl,
                imageId: image.imageId,
                location: post.location,
                tags: tags,
            }
        );
        if(!updatedPost) {
            if(hasFileToUpdate) {
                await deleteFile(image.imageId)
            }
            throw Error;
        }
        if (hasFileToUpdate) {
            await deleteFile(post.imageId);
        }
        return updatedPost;
    }
    catch (error) {
        console.log(error)
    } 
}

// Deleting any post
export async function deletePost(postId?: string, imageId?: string) {
    if (!postId || !imageId) return;

    try {
        const statusCode = await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId
        );
        if(!statusCode) throw Error;
        
        await deleteFile(imageId);

        return { status: "Ok" };
    }
    catch (error) {
        console.log(error);
    }
}

// Infinite Posts
export async function getInfinitePosts({ pageParam } : { pageParam: number }) {
    const queries: any[] = [Query.orderDesc("$updatedAt"), Query.limit(9)];

    if (pageParam) {
        queries.push(Query.cursorAfter(pageParam.toString()))
    }

    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            queries
        );

        if (!posts) throw Error;

        return posts;
    }
    catch (error) {
        console.log(error)
    }
}

// Search Posts
export async function searchPosts(searchTerm: string) {
    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            [Query.search("caption", searchTerm)]
        );

        if (!posts) throw Error;

        return posts;
    }
    catch (error) {
        console.log(error);
    }
}

// Get Users
export async function getUsers(limit?: number) {
    const queries: any[] = [Query.orderDesc("$createdAt")];

    if(limit) {
        queries.push(Query.limit(limit))
    }
    try {
        const users = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            queries
        );
        if (!users) throw Error;

        return users;
    }
    catch (error) {
        console.log(error);
    }
}

// Update User
export async function updateUser(user: IUpdateUser) {
    const hasFileToUpdate = user.file.length > 0;
    try {
        let image = {
            imageUrl: user.imageUrl,
            imageId: user.imageId
        };

        if (hasFileToUpdate) {
            const uploadedFile = await uploadFile(user.file[0])

            if(!uploadedFile) throw Error;

            const fileUrl = getFilePreview(uploadedFile.$id);
            if(!fileUrl) {
                await deleteFile(uploadedFile.$id);
                throw Error;
            }
            image = {...image, imageUrl: fileUrl, imageId: uploadedFile.$id};
        }
        const updatedUser = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            user.userId,
            {
                name: user.name,
                bi0: user.bio,
                imageUrl: image.imageUrl,
                imageId: image.imageId
            }
        );
        if(!updatedUser) {
            if (hasFileToUpdate) {
                await deleteFile(image.imageId);
            }
            throw Error;
        }
        if (user.imageId && hasFileToUpdate) {
            await deleteFile(user.imageId);
        }
        return updatedUser;
    }
    catch (error) {
        console.log(error);
    }
}

// Getting user by the ID
export async function getUserById(userId: string) {
    try {
        const user = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            userId
        );
        if(!user) throw Error;

        return user;
    }
    catch (error) {
        console.log(error);
    }
}

// Popular / Recent Posts by the User
export async function getRecentPosts() {
    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            [Query.orderDesc("$createdAt"), Query.limit(20)]
        );  
        if (!posts) throw Error;
  
        return posts;
    }
    catch (error) {
        console.log(error);
    }
}

// Getting User's Post
export async function getUserPosts(userId?: string) {
    if (!userId) return;
  
    try {
        const post = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
        );
  
        if (!post) throw Error;
  
        return post;
    }
    catch (error) {
        console.log(error);
    }
}

// Getting the account of the user
export async function getAccount() {
    try {
        const currentAccount = await account.get();

        return currentAccount;
    }
    catch (error) {
        console.log(error);
    }
}