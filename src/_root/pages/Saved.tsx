import { Models } from "appwrite";
import { GridPostList, Loader } from "@/components/shared";
import { useGetCurrentUser } from "@/lib/react-query/queries";

const Saved = () => {
  const { data: currentUser, isLoading, error } = useGetCurrentUser();

  if (isLoading) return <Loader />;
  if (error) return <p>Error loading saved posts.</p>;

  const savePosts = currentUser?.save
    ?.map((savePost: Models.Document) => ({
      ...savePost.post,
      creator: {
        imageUrl: savePost.creatorImageUrl || currentUser.imageUrl,
      },
    }))
    .reverse() || [];

  return (
    <div className="saved-container">
      <div className="flex gap-2 w-full max-w-5xl">
        <img
          src="/assets/icons/save.svg"
          width={36}
          height={36}
          alt="Saved"
          className="invert-white"
        />
        <h2 className="h3-bold md:h2-bold text-left w-full">Saved Posts</h2>
      </div>

      <ul className="w-full flex justify-center max-w-5xl gap-9">
        {savePosts.length === 0 ? (
          <p className="text-light-4">No available posts</p>
        ) : (
          <GridPostList posts={savePosts} showStats={false} />
        )}
      </ul>
    </div>
  );
};

export default Saved;