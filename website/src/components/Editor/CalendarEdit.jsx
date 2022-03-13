import React, { useEffect, useState } from "react";
import { Plus, Trash, Edit3 } from "react-feather";
import InputBox from "./InputComponents/InputBox";
import InputDropdown from "./InputComponents/InputDropdown";
import DialogBox from "../DialogBox";
import LoadingScreen, { LoadingButton } from "../LoadingScreen";
import { eventSubtypes } from "../Events/Calendar";
import { fetchWithToken } from "../../firebase";
import { setErrorMessage } from "../../misc";

const MONTHS = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

export const CalendarEdit = ({
  data,
  loaded,
  refetchData,
  year,
  month,
  setYear,
  setMonth,
}) => {
  const [currentlyActive, setCurrentlyActive] = useState("_default");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [colour, setColour] = useState("");

  const [clickedSubmit, setClickedSubmit] = useState(false);
  const [clickedDelete, setClickedDelete] = useState(false);

  const [popupSuccess, setPopupSuccess] = useState(false);
  const [popupDelete, setPopupDelete] = useState(false);
  const [popupError, setPopupError] = useState(false);
  const [errorCode, setErrorCode] = useState(null);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    // Get the currently selected event
    const event = (data?.events ?? [])
      .filter((event) => event.id === currentlyActive)
      .shift();
    if (!event) {
      // No currently selected event
      return void _resetAllInputs();
    }
    setName(event.title);
    setType(event.type);
    // setStartDate(serialiseDateArray(event.startDate));
    // setEndDate(serialiseDateArray(event.endDate));
    setStartDate(event.date.start);
    setEndDate(event.date.end);
    setColour(event.colour);
  }, [currentlyActive]);

  useEffect(() => {
    // Set the selected option to "new event" when the calendar period is changed
    setCurrentlyActive("_default");
  }, [year, month]);

  // Display loading screen if calendar data hasn't been retrieved yet
  if (!loaded) {
    return <LoadingScreen />;
  }

  const calendarEvents = {};
  for (const event of data?.events ?? []) {
    calendarEvents[event.id] = event.title;
  }

  // Bitwise AND to ensure both functions are called
  const refresh = () => refetchData() & _resetAllInputs();

  function _resetAllInputs() {
    for (const setVar of [
      setName,
      setType,
      setStartDate,
      setEndDate,
      setColour,
    ]) {
      setVar("");
    }
    setCurrentlyActive("_default");
  }

  function _handleSubmit(e) {
    e.preventDefault();
    setClickedSubmit(true);
    let url = "/calendar/";
    let method = "POST";
    // Check if an existing event is selected
    if (currentlyActive !== "_default") {
      method = "PUT";
      url += currentlyActive;
    }
    // ?title=Nazwa wydarzenia kalendarzowego.&type=2&startDate=1&endDate=1
    const params = {
      title: name,
      type,
      startDate,
      endDate,
      colour,
    };
    fetchWithToken(url, method, params).then((res) => {
      // Update the data once request is processed
      if (res.ok) {
        refresh();
        setPopupSuccess(true);
      } else {
        setErrorCode(res.status);
        setErrorMessage(res, setPopupError);
      }
      setClickedSubmit(false);
    });
  }

  function _handleDelete() {
    setClickedDelete(true);
    fetchWithToken(`/calendar/${currentlyActive}`, "DELETE").then((_res) => {
      // Update the data once request is processed
      refresh();
      setClickedDelete(false);
    });
  }

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
      <DialogBox
        header={`Bład! (HTTP ${errorCode})`}
        content="Nastąpił błąd podczas wykonywania tej akcji. Spróbuj ponownie."
        extra={popupError}
        type="DIALOG"
        buttonOneLabel="Ok"
        isVisible={popupError}
        setVisible={setPopupError}
      />
      <InputDropdown
        label="Miesiąc w kalendarzu"
        currentValue={month}
        onChangeCallback={setMonth}
        valueDisplayObject={MONTHS}
      />
      <InputDropdown
        label="Wydarzenie do edycji"
        currentValue={currentlyActive}
        onChangeCallback={setCurrentlyActive}
        defaultLabel="Nowe wydarzenie"
        valueDisplayObject={calendarEvents}
        isFirst={false}
      />
      <InputDropdown
        label="Typ wydarzenia"
        currentValue={type}
        onChangeCallback={setType}
        valueDisplayObject={eventSubtypes.slice(2)}
        isFirst={false}
      />
      <InputBox
        maxLength={64}
        name="event-name"
        placeholder="Nazwa wydarzenia"
        value={name}
        onChange={setName}
      />
      <div
        className="fr"
        style={{
          width: "100%",
          margin: "-1em 0",
          justifyContent: "space-between",
        }}
      >
        <InputBox
          width="47%"
          name="event-time-start"
          type="date"
          pattern="dd/mm/yyyy"
          placeholder="Rozpoczęcie"
          value={startDate}
          onChange={setStartDate}
        />
        <p className="from-to-indicator">-</p>
        <InputBox
          width="47%"
          name="event-time-end"
          type="date"
          pattern="dd/mm/yyyy"
          placeholder="Zakończenie"
          value={endDate}
          onChange={setEndDate}
        />
      </div>

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
              <p>usuń post</p>
            </button>
          ))}
        {clickedSubmit ? (
          <LoadingButton isOpaque={true} />
        ) : (
          <button type="submit" className="add-btn">
            {currentlyActive !== "_default" ? (
              <Edit3 color="#FFFFFF" size={24} />
            ) : (
              <Plus color="#FFFFFF" size={24} />
            )}
            <p>
              {currentlyActive !== "_default"
                ? "edytuj wydarzenie"
                : "dodaj wydarzenie"}
            </p>
          </button>
        )}
      </div>
    </form>
  );
};