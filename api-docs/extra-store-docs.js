// Psedo store for submit
exports.submit = {
  storeName: 'videoSubmit',
  'main-doc': `
    This is the main doc for videoSubmit. This is strictly only for POSTing. The content-type must
    be \`multipart/form-data\` when submitting.
  `,
  handlePost: true,
  'schema-doc':`
    The schema only has two values:
    * \`video\`: The schema holds a video's data. The store doesn't implement a 'put' because videos need to be added by the user
    using the specific /submit URL. For the public, this store is for querying only.
    * \`data\`: a text field containing a valid JSON object (see later)
    Here, \`data\` needs to contain the following fields:
    * \`title\`. The video's title.
    * \`tags\`. An array representing a list of tags that will be associated to the video. There must be at least one tag
    * \`superTags\`. Same as tags. However, superTags can only be:
      'Reviews and Unboxing', 'Howto and Style', 'Travel', 'Events', 'People and Blogs', 'Video CV',
      'Video Business card', 'Speed Date', 'Cooking and Recipes', 'Buy and Sell Ads', 'Job Offers', 'Real Estate',
      'Testify something', 'Body Art and Performances', 'Autos and Vehicles', 'Theater', 'Comedy',
      'Education', 'Cinema and Animation', 'Gaming', 'Music', 'News and Politics', 'Nonprofits and Activism',
      'Pets and Animals', 'Science and Technology', 'Sports', 'Restaurants and Hotels', 'UFO and Mysteries',
      'Art Gallery', 'Garage Sale', 'Handmade and Markets', 'Nature and Outdoor',
    * \`templateId\`. The template ID the video is based on.
    * \`depth\`. The video's depth.
    * \`location\`. The videos' location, expressed as an object like this: \`{ coordinates: [ long, lat ] }\`.
  `,
  //OKresponses: [
  //  { name: 'OK', status: 200, data: '{ id: videoId }', doc: `The video ID of the video just created` }
  //],
  'item-doc':`
    { id: videoId }
  `,
  'error-format-doc':`
    { message: 'The message', errors: [ { field1: 'message1',  field2: 'message2' } ] } (errors is optional)
  `,
  errorResponses: [
    { name: 'BadRequestError', Status: 400, data: this['error-format-doc'], 'Content-type': 'text/html', doc: "One of the required fields (title, tags, supereTags, Some IDs in the URL are in the wrong format"},
  ],
  echoAfterPost: true,

};
