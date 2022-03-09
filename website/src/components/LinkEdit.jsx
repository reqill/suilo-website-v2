import React, { useEffect, useState } from "react";
import { Plus, Trash, Edit3 } from "react-feather";
import InputBox from "../components/InputBox";
import InputDropdown from "../components/InputDropdown";
import DialogBox from "../components/DialogBox";
import { LoadingButton, LoadingScreen } from "../pages/Edit";
import { fetchWithToken } from "../firebase";

export const LinkEdit = ({ data, loaded, refetchData }) => {
  const [currentlyActive, setCurrentlyActive] = useState("_default");
  const [longLink, setLongLink] = useState("");
  const [shortLink, setShortLink] = useState("");
  const [clickedSubmit, setClickedSubmit] = useState(false);
  const [clickedDelete, setClickedDelete] = useState(false);

  const [popupSuccess, setPopupSuccess] = useState(false);
  const [popupDelete, setPopupDelete] = useState(false);

  /** Gets the reference of the currently selected short link. */
  function _getCurrentlyActive() {
    return data?.contents?.[parseInt(currentlyActive)];
  }

  useEffect(() => {
    if (!loaded) {
      return;
    }
    const _currentLink = _getCurrentlyActive();
    if (!_currentLink) {
      // No currently selected link
      return void _resetAllInputs();
    }
    setLongLink(_currentLink.destination);
    setShortLink(_currentLink.id);
  }, [currentlyActive]);

  // Display loading screen if events data hasn't been retrieved yet
  if (!loaded) {
    return <LoadingScreen />;
  }

  // Bitwise AND to ensure both functions are called
  const refresh = () => refetchData() & _resetAllInputs();

  function _resetAllInputs() {
    for (const setVar of [setLongLink, setShortLink]) {
      setVar("");
    }
    setCurrentlyActive("_default");
  }

  const _handleSubmit = (e) => {
    e.preventDefault();
    setClickedSubmit(true);
    let url = "/links/";
    let method = "POST";
    // Check if an existing event is selected
    if (currentlyActive === "_default") {
      url += shortLink;
    } else {
      method = "PUT";
      url += _getCurrentlyActive().id;
    }
    // ?destination=null
    const params = { destination: longLink };
    fetchWithToken(url, method, params).then((res) => {
      // Update the data once request is sent
      res.ok && refresh();
      setClickedSubmit(false);
      setPopupSuccess(res.ok);
    });
  };

  const _handleDelete = () => {
    setClickedDelete(true);
    // currentlyActive is the index of the short link in the array
    fetchWithToken(`/links/${_getCurrentlyActive().id}`, "DELETE").then(
      (_res) => {
        // Update the data once request is sent
        refresh();
        setClickedDelete(false);
      }
    );
  };

  // Get array of short link URLs
  const links = (data.contents ?? []).map((link) => `${link.id} > ${link.destination}`);
  return (
    <form className="w-full mt-6" onSubmit={_handleSubmit}>
      <DialogBox
        header="Sukces!"
        content="Pomyślnie dokonano wszelkich zmian"
        duration={2000}
        isVisible={popupSuccess}
        setVisible={setPopupSuccess}
      />
      <DialogBox
        header="Uwaga!"
        content="Czy na pewno chcesz usunąć zawartość? Ta akcja jest nieodwracalna."
        type="DIALOG"
        buttonOneLabel="Kontynuuj edycje"
        buttonTwoLabel="Usuń"
        buttonTwoCallback={_handleDelete}
        isVisible={popupDelete}
        setVisible={setPopupDelete}
      />
      <InputDropdown
        label="Link do edycji"
        currentValue={currentlyActive.id ?? currentlyActive}
        onChangeCallback={setCurrentlyActive}
        defaultLabel="Nowy link"
        valueDisplayObject={links}
      />
      <InputBox
        maxLength={128}
        name="long-link"
        placeholder="Link do skrócenia"
        value={longLink}
        onChange={setLongLink}
      />
      <InputBox
        maxLength={32}
        name="short-link"
        placeholder="Skrócony kod linku"
        value={shortLink}
        onChange={setShortLink}
      />
      <div className="fr" style={{ width: "100%", justifyContent: "right" }}>
        {currentlyActive !== "_default" &&
          (clickedDelete ? (
            <LoadingButton />
          ) : (
            <button
              type="button"
              className="delete-btn"
              onClick={() => setPopupDelete(true)}
            >
              <Trash color="rgb(252, 63, 30)" size={20} />
              <p>usuń link</p>
            </button>
          ))}
        {clickedSubmit ? (
          <LoadingButton style="opaque" />
        ) : (
          <button type="submit" className="add-btn">
            {currentlyActive !== "_default" ? (
              <Edit3 color="#FFFFFF" size={24} />
            ) : (
              <Plus color="#FFFFFF" size={24} />
            )}
            <p>
              {currentlyActive !== "_default" ? "edytuj link" : "dodaj link"}
            </p>
          </button>
        )}
      </div>
    </form>
  );
};
