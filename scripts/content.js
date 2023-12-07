const table = document.getElementById("gsc_a_t")

console.log(table);

// `document.querySelector` may return null if the selector doesn't match anything
if(table) {
    const rows = table.rows;

    console.log(rows);

    const headerRow = rows[1];
    const newHeaderCell = document.createElement("th");
    newHeaderCell.textContent = "Impact Factor";
    newHeaderCell.classList.add("gsc_a_y");
    newHeaderCell.style.width = "5%";
    headerRow.insertBefore(newHeaderCell, headerRow.children[3]);

    for(var i= 2; i< table.rows.length; i++){
        var cell = rows[i].insertCell(3);
        cell.innerHTML = "1";
        cell.classList.add("gsc_a_y");
        cell.style.width = "5%";
    }
}