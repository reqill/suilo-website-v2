import React from "react";
import PostCardPrimary from "../components/PostCardPrimary";
import PostCardSecondary from "../components/PostCardSecondary";
import PostCardMain from "../components/PostCardMain";
import { API_URL, DEFAULT_IMAGE, fetchData } from "../misc";

// Set number of items on page to 3 primary, 4 secondary and 8 main.
// Can introduce useState variable for user customisability or leave it hard-coded.
export const PRIMARY_ITEMS_DEFAULT = 3;
export const SECONDARY_ITEMS_DEFAULT = 4;
export const MAIN_ITEMS_DEFAULT = 8;
const ITEMS_PER_PAGE =
  PRIMARY_ITEMS_DEFAULT + SECONDARY_ITEMS_DEFAULT + MAIN_ITEMS_DEFAULT;

const NO_NEWS_MESSAGE = "Brak aktualności.";

/** Compare two objects that contain a 'date' attribute. */
function sortArticles(article1, article2) {
  return new Date(article2.date) - new Date(article1.date);
}

/** Fetch the data for the news article previews. */
export function fetchNewsData({
  setNewsData,
  setLoaded = () => {},
  updateCache = false,
  pageNumber = 1,
  maxItems = ITEMS_PER_PAGE,
}) {
  /** Populate the data containers with the API request response's JSON data. */
  function processJsonData(jsonData) {
    if (!jsonData || !jsonData.contents) {
      console.log("Could not retrieve data");
      return setLoaded(true);
    }
    // map each article so that if it doesn't contain a 'photo' attribute it uses the default image
    const data = jsonData.contents.sort(sortArticles).map((article) => {
      return { ...article, photo: article.photo || DEFAULT_IMAGE };
    });
    const newCache = {
      date: new Date(),
      data,
    };
    localStorage.setItem(`news_page_${pageNumber}`, JSON.stringify(newCache));
    console.log("Created cache for news data.", newCache);
    setNewsData(data);
    setLoaded(true);
  }

  const url = `/news/?page=${pageNumber}&items=${maxItems}`;
  const args = {
    setData: setNewsData,
    setLoaded,
    updateCache,
    onSuccessCallback: processJsonData,
  };
  fetchData(`news_page_${pageNumber}`, url, args);
}

export function PostCardPreview({
  type,
  data,
  linkPrefix = "",
  classOverride,
  startIndex,
  numItems,
}) {
  if (data === undefined) {
    console.log("News data is undefined. Not rendering preview.");
    return null;
  }
  const defaultItems = {
    primary: {
      element: PostCardPrimary,
      startIndex: 0,
      numItems: PRIMARY_ITEMS_DEFAULT,
    },
    secondary: {
      element: PostCardSecondary,
      startIndex: PRIMARY_ITEMS_DEFAULT,
      numItems: SECONDARY_ITEMS_DEFAULT,
    },
    main: {
      element: PostCardMain,
      startIndex: PRIMARY_ITEMS_DEFAULT + SECONDARY_ITEMS_DEFAULT,
      numItems: MAIN_ITEMS_DEFAULT,
    },
  };
  const elem = defaultItems[type].element;
  startIndex === undefined && (startIndex = defaultItems[type].startIndex);
  numItems === undefined && (numItems = defaultItems[type].numItems);

  const className = classOverride || `${type}-grid`;
  const _data = [...data].splice(startIndex, numItems);
  if (_data.length === 0) {
    if (classOverride && classOverride.startsWith("home")) {
      return (
        <div style={{ width: "100%" }}>
          <p>{NO_NEWS_MESSAGE}</p>
        </div>
      );
    }
    if (type === "primary") {
      return NO_NEWS_MESSAGE;
    }
    return null;
  }
  return (
    <div className={className}>
      {_data.map((el, idx) => {
        el.link = linkPrefix + el.id;
        return React.createElement(elem, { key: el.id + idx, data: el });
      })}
    </div>
  );
}

export default PostCardPreview;
