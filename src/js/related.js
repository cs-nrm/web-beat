export function getRelatedPosts(allPosts, currentSlug, currentCats) {
    const relatedPosts = allPosts.filter(
      post =>
        post.slug !== currentSlug 
    )
  
    return relatedPosts.slice(0, 4) // get the first 4 posts with slice()
}