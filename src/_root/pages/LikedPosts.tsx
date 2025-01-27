import { GridPostList, Loader } from "@/components/shared";
import { useGetCurrentUser } from "@/lib/react-query/queries";

const LikedPosts = () => {
  const { data: currentUser, isLoading } = useGetCurrentUser();

  if (isLoading) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  if (!currentUser || !Array.isArray(currentUser.liked)) {
    return (
      <div className="flex-center w-full h-full">
        <p className="text-light-4">No liked posts</p>
      </div>
    );
  }

  return (
    <>
      {currentUser.liked.length === 0 ? (
        <p className="text-light-4">No liked posts</p>
      ) : (
        <GridPostList posts={currentUser.liked} showStats={false} />
      )}
    </>
  );
};

export default LikedPosts;