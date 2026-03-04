import moment from "moment";

export const removeAccentsAndSpaces = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
};

export const imageFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
    req.fileValidationError = "Only image files are allowed!";
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

export const docsFilter = (req, file, cb) => {
  // Accept images only
  if (
    !file.originalname.match(
      /.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|pdf|PDF|mp3|ogg)$/,
    )
  ) {
    req.fileValidationError = "Only image files are allowed!";
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

export const imageFilterExcel = (req, file, cb) => {
  // Accept Excel only
  if (!file.originalname.match(/.(xls|xlsx)$/)) {
    req.fileValidationError = "Only excel files are allowed!";
    return cb(new Error("Only excel files are allowed!"), false);
  }
  cb(null, true);
};

export const uuid = () => {
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const urlMedia = () => {
  const date = new Date();
  const year = moment(date).format("YYYY");
  const month = moment(date).format("MM");
  const day = moment(date).format("DD");
  return `consciente-seguros/media/${year}/${month}/${day}`;
};

export const randomString = (length) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = " ";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const nameDayWeekForDay = (currentDay) => {
  let current = new Date(moment(currentDay).add(1, "day").format("YYYY-MM-DD"));
  let day = current.getDay();

  let Monday = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + (day == 0 ? -6 : 1) - day,
  );
  let Tuesday = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + (day == 0 ? -6 : 2) - day,
  );
  let Wednesday = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + (day == 0 ? -6 : 3) - day,
  );
  let Thursday = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + (day == 0 ? -6 : 4) - day,
  );
  let Friday = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + (day == 0 ? -6 : 5) - day,
  );
  let Saturday = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + (day == 0 ? -6 : 6) - day,
  );
  let Sunday = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + (day == 0 ? 0 : 7) - day,
  );

  switch (moment(current).format("YYYY-MM-DD")) {
    case moment(Monday).format("YYYY-MM-DD"):
      return "Lunes";

    case moment(Tuesday).format("YYYY-MM-DD"):
      return "Martes";

    case moment(Wednesday).format("YYYY-MM-DD"):
      return "Miércoles";

    case moment(Thursday).format("YYYY-MM-DD"):
      return "Jueves";

    case moment(Friday).format("YYYY-MM-DD"):
      return "Viernes";

    case moment(Saturday).format("YYYY-MM-DD"):
      return "Sábado";

    case moment(Sunday).format("YYYY-MM-DD"):
      return "Domingo";
  }
};

export const nameMonthForNumber = (month) => {
  switch (month) {
    case "01":
      return "Enero";

    case "02":
      return "Febrero";

    case "03":
      return "Marzo";

    case "04":
      return "Abril";

    case "05":
      return "Mayo";

    case "06":
      return "Junio";

    case "07":
      return "Julio";

    case "08":
      return "Agosto";

    case "09":
      return "Septiembre";

    case "10":
      return "Octubre";

    case "11":
      return "Noviembre";

    case "12":
      return "Diciembre";
  }
};

export const searchCell = (value) => {
  const arrayCells = [
    "E",
    "G",
    "I",
    "K",
    "M",
    "O",
    "Q",
    "S",
    "U",
    "W",
    "Y",
    "AA",
    "AC",
    "AE",
    "AG",
    "AI",
    "AK",
    "AM",
    "AO",
    "AQ",
    "AS",
    "AU",
    "AW",
    "AY",
    "BA",
    "BC",
    "BE",
    "BG",
    "BI",
    "BK",
    "BM",
    "BO",
    "BQ",
    "BS",
    "BU",
    "BW",
    "BY",
  ];
  return arrayCells[value];
};

export const convertDateImportExcel = (numeroDeDias, esExcel = false) => {
  var diasDesde1900 = esExcel ? 25567 + 1 : 25567;
  // 86400 es el número de segundos en un día, luego multiplicamos por 1000 para obtener milisegundos.
  return new Date((numeroDeDias - diasDesde1900) * 86400 * 1000);
};
