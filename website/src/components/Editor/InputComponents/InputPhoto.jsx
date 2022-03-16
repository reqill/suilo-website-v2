import React, { useEffect, useState } from "react";
import {
  DEFAULT_IMAGE,
  getDataFromFilename,
  handlePhotoUpdate,
} from "../../../misc";
import InputBox from "./InputBox";
import InputDropdown from "./InputDropdown";
import InputFile from "./InputFile";

const OPTIONS = [
  "Prześlij nowe zdjęcie",
  "Wpisz URL zdjęcia",
  "Użyj istniejącego zdjęcia",
  "Brak zdjęcia",
];

export default function InputPhoto({
  imageURL,
  setImageURL,
  photos,
  imageAuthor,
  setImageAuthor,
  imageAltText,
  setImageAltText,
}) {
  const [selectedOption, setSelectedOption] = useState(0);
  const [existingPhoto, setExistingPhoto] = useState("");
  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    // Set the default option whenever the post is changed
    if (photos.includes(imageURL)) {
      setSelectedOption(2);
      if (existingPhoto !== imageURL) {
        _handlePreviewChange(imageURL);
      }
    } else {
      selectedOption !== 3 && setSelectedOption(imageURL ? 1 : 0);
    }
  }, [imageURL]);

  useEffect(() => {
    // Reset the inputs whenever the selected option is changed
    if (selectedOption === 2) {
      if (photos.includes(imageURL) && !preview) {
        _handlePreviewChange(imageURL);
      }
    } else {
      if (selectedOption !== 1) {
        setImageURL("");
      }
      setExistingPhoto("");
      setPreview(null);
    }
    setImageFile(null);
  }, [selectedOption]);

  /** Reads the relevant fields from the image's metadata and updates the client-side data. */
  function setMetadata(rawMetadata) {
    let metadata = {};
    try {
      metadata = JSON.parse(rawMetadata)?.customMetadata ?? {};
    } catch (parseError) {
      console.log(parseError);
    }
    setImageAuthor && setImageAuthor(metadata.author ?? "");
    setImageAltText && setImageAltText(metadata.altText ?? "");
  }

  function _handlePreviewChange(photoName) {
    setExistingPhoto(photoName);

    setImageURL(photoName);
    setPreview(DEFAULT_IMAGE);
    getDataFromFilename(photoName, "400x300", setPreview, setMetadata);
  }

  function _handleSelectPhoto(e) {
    setImageFile(e.target.files[0]);
  }

  const canUploadFile =
    (!setImageAuthor || imageAuthor) && (!setImageAltText || imageAltText);

  const showImageMetadataInputs = [0, 1].includes(selectedOption);

  const uploadBtnStyle = { marginTop: -10, marginBottom: 8 };
  canUploadFile || (uploadBtnStyle.cursor = "not-allowed");

  /** Uploads the selected file to the server. */
  function _handleSubmitPhoto(e) {
    if (canUploadFile) {
      handlePhotoUpdate(imageFile, setImageURL, imageAuthor, imageAltText);
    } else {
      e.preventDefault();
    }
  }

  return (
    <div>
      <div className="w-full inline-flex justify-between pl-20 pr-20">
        {OPTIONS.map((text, idx) => (
          <label className="select-none" key={idx}>
            <input
              className="mr-2"
              type="radio"
              name="photoRadio"
              checked={idx === selectedOption}
              onChange={() => setSelectedOption(idx)}
            />
            {text}
          </label>
        ))}
      </div>
      {selectedOption === 0 ? (
        <InputFile
          label={"Miniatura"}
          placeholder={"Wybierz zdjęcie..."}
          onChange={_handleSelectPhoto}
          acceptedExtensions=".jpeg, .jpg, .png"
          required
        />
      ) : selectedOption === 1 ? (
        <InputBox
          name="image-url"
          placeholder="URL zdjęcia"
          maxLength={256}
          value={imageURL}
          onChange={setImageURL}
          required
          choices={photos}
        />
      ) : (
        selectedOption === 2 && (
          <InputDropdown
            name="existing-image"
            label="Nazwa zdjęcia"
            currentValue={photos.indexOf(existingPhoto)}
            defaultLabel={imageURL ? "" : "<Wybierz>"}
            onChangeCallback={(idx) => _handlePreviewChange(photos[idx])}
            valueDisplayObject={photos}
            isFirst={false}
            required
          />
        )
      )}
      {preview && (
        <img
          className="mt-3 bg-gray-200/75 object-cover w-full aspect-[16/10] rounded-xl group-hover:ring-[.2rem] ring-primaryDark/40 transition-all duration-300"
          src={preview}
        />
      )}
      {showImageMetadataInputs && setImageAuthor && (
        <InputBox
          name="image-author"
          placeholder="Autor zdjęcia"
          maxLength={64}
          value={imageAuthor}
          onChange={setImageAuthor}
          required
        />
      )}
      {showImageMetadataInputs && setImageAltText && (
        <InputBox
          name="image-alt-text"
          placeholder="Tekst alternatywny do zdjęcia"
          maxLength={64}
          value={imageAltText}
          onChange={setImageAltText}
          required
        />
      )}
      {imageFile && selectedOption === 0 && (
        <div>
          <button
            type="button"
            className="add-btn"
            style={uploadBtnStyle}
            onClick={_handleSubmitPhoto}
          >
            <p>Prześlij zdjęcie</p>
          </button>
        </div>
      )}
    </div>
  );
}
