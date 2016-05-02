var data; // a global

d3.json("scpd_incidents.json", function(error, json) {
  if (error) return console.warn(error);
  data = json;
  console.log(data);
});