import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/react-query/queryKeys";
import {
  createUserAccount,
  signInAccount,
  getCurrentUser,
  signOutAccount,
  getUsers,
  createPost,
  getPostById,
  updatePost,
  getUserPosts,
  deletePost,
  likePost,
  getUserById,
  updateUser,
  getRecentPosts,
  getInfinitePosts,
  searchPosts,
  savePost,
  deleteSavedPost,
} from "@/lib/appwrite/api";
//import { INewPost, INewUser, IUpdatePost, IUpdateUser } from "@/types";

// Factory Pattern: Create a factory function for query hooks
const createQueryHook = <TData, TError>(
  queryKey: any,
  queryFn: () => Promise<TData>,
  options: any = {}
) => {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    ...options,
  });
};

// Factory Pattern: Create a factory function for mutation hooks
const createMutationHook = <TData, TError>(
  mutationFn: (variables: any) => Promise<TData>,
  onSuccess: (data: TData, queryClient: any) => void
) => {
  const queryClient = useQueryClient();
  return useMutation<TData, TError, any>({
    mutationFn,
    // Command Pattern: Encapsulates the action and its side effects
    onSuccess: (data) => {
      onSuccess(data, queryClient);
    },
  });
};

// AUTH QUERIES
export const useCreateUserAccount = () =>
  createMutationHook(createUserAccount, () => {});

export const useSignInAccount = () =>
  createMutationHook(signInAccount, () => {});

export const useSignOutAccount = () =>
  createMutationHook(signOutAccount, () => {});

// POST QUERIES
export const useGetPosts = () => {
  return useInfiniteQuery({
    queryKey: [QUERY_KEYS.GET_INFINITE_POSTS],
    queryFn: getInfinitePosts as any,
    getNextPageParam: (lastPage: any) => {
      if (lastPage && lastPage.documents.length === 0) {
        return null;
      }
      const lastId = lastPage.documents[lastPage.documents.length - 1].$id;
      return lastId;
    },
  });
};

export const useSearchPosts = (searchTerm: string) =>
  createQueryHook(
    [QUERY_KEYS.SEARCH_POSTS, searchTerm],
    () => searchPosts(searchTerm),
    {
      enabled: !!searchTerm,
    }
  );

export const useGetRecentPosts = () =>
  createQueryHook([QUERY_KEYS.GET_RECENT_POSTS], getRecentPosts);

export const useCreatePost = () =>
  createMutationHook(createPost, (data, queryClient) => {
    // Example: Log the data or perform additional actions
    console.log("Post created successfully:", data);

    // Observer Pattern: Notifies components to refetch data
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
    });
  });

export const useGetPostById = (postId?: string) =>
  createQueryHook(
    [QUERY_KEYS.GET_POST_BY_ID, postId],
    () => getPostById(postId),
    {
      enabled: !!postId,
    }
  );

export const useGetUserPosts = (userId?: string) =>
  createQueryHook(
    [QUERY_KEYS.GET_USER_POSTS, userId],
    () => getUserPosts(userId),
    {
      enabled: !!userId,
    }
  );

export const useUpdatePost = () =>
  createMutationHook(updatePost, (data, queryClient) => {
    // Observer Pattern: Notifies components to refetch data
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.GET_POST_BY_ID, data?.$id],
    });
  });

  export const useDeletePost = () =>
    createMutationHook(
      ({ postId, imageId }: { postId?: string; imageId: string }) =>
        deletePost(postId, imageId),
      (data, queryClient) => {
        // Example: Log the data or perform additional actions
        console.log("Post deleted successfully:", data);
  
        // Observer Pattern: Notifies components to refetch data
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
        });
      }
    );

export const useLikePost = () =>
  createMutationHook(
    ({ postId, likesArray }: { postId: string; likesArray: string[] }) =>
      likePost(postId, likesArray),
    (data, queryClient) => {
      // Observer Pattern: Notifies components to refetch data
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_POST_BY_ID, data?.$id],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_POSTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
      });
    }
  );

  export const useSavePost = () =>
    createMutationHook(
      ({ userId, postId }: { userId: string; postId: string }) =>
        savePost(userId, postId),
      (data, queryClient) => {
        // Example: Log the data or perform additional actions
        console.log("Post saved successfully:", data);
  
        // Observer Pattern: Notifies components to refetch data
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.GET_CURRENT_USER],
        });
      }
    );

    export const useDeleteSavedPost = () =>
      createMutationHook(
        (savedRecordId: string) => deleteSavedPost(savedRecordId),
        (data, queryClient) => {
          // Example: Log the data or perform additional actions
          console.log("Saved post deleted successfully:", data);
    
          // Observer Pattern: Notifies components to refetch data
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.GET_CURRENT_USER],
          });
        }
      );

// USER QUERIES
export const useGetCurrentUser = () =>
  createQueryHook([QUERY_KEYS.GET_CURRENT_USER], getCurrentUser);

export const useGetUsers = (limit?: number) =>
  createQueryHook([QUERY_KEYS.GET_USERS], () => getUsers(limit));

export const useGetUserById = (userId: string) =>
  createQueryHook(
    [QUERY_KEYS.GET_USER_BY_ID, userId],
    () => getUserById(userId),
    {
      enabled: !!userId,
    }
  );

export const useUpdateUser = () =>
  createMutationHook(updateUser, (data, queryClient) => {
    // Observer Pattern: Notifies components to refetch data
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.GET_CURRENT_USER],
    });
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.GET_USER_BY_ID, data?.$id],
    });
  });