const markerReserveBytes = Buffer.byteLength(
  "<!-- location-review-detail:999999/999999 -->\n",
  "utf8"
);

export function reviewCommentBodies(sections, maxBytes = 55000) {
  if (!Number.isInteger(maxBytes) || maxBytes <= markerReserveBytes) {
    throw new Error(`Review comment byte limit is too small: ${maxBytes}`);
  }

  const contentLimit = maxBytes - markerReserveBytes;
  const chunks = sections.flatMap(([title, sectionLines]) =>
    sectionCommentChunks(title, sectionLines, contentLimit)
  );

  return chunks.map((body, index) => {
    const markedBody = `<!-- location-review-detail:${index + 1}/${chunks.length} -->\n${body}`;
    if (Buffer.byteLength(markedBody, "utf8") > maxBytes) {
      throw new Error(`Review comment chunk exceeds ${maxBytes} bytes after adding its marker`);
    }
    return markedBody;
  });
}

function sectionCommentChunks(title, sectionLines, maxBytes) {
  const sectionPrefix = [`## ${title}`, ""];
  const chunks = [];
  let current = [...sectionPrefix];
  let tableHeader = null;

  const flush = () => {
    trimTrailingBlankLines(current);
    if (current.length > sectionPrefix.length) chunks.push(current.join("\n"));
    current = [...sectionPrefix];
    if (tableHeader) current.push(...tableHeader);
  };

  for (let index = 0; index < sectionLines.length; index += 1) {
    const line = String(sectionLines[index] ?? "");
    const nextLine = String(sectionLines[index + 1] ?? "");

    if (isTableRow(line) && isTableDelimiter(nextLine)) {
      tableHeader = [line, nextLine];
      if (bodyBytes([...current, ...tableHeader]) > maxBytes) {
        flush();
      }
      if (!endsWithLines(current, tableHeader)) current.push(...tableHeader);
      assertFits(current, tableHeader, maxBytes);
      index += 1;
      continue;
    }

    if (!isTableRow(line)) tableHeader = null;
    if (bodyBytes([...current, line]) > maxBytes) flush();
    assertLineFits(line, maxBytes);
    if (bodyBytes([...current, line]) > maxBytes) {
      throw new Error(`Review comment prefix and indivisible content exceed ${maxBytes} bytes`);
    }
    current.push(line);
  }

  trimTrailingBlankLines(current);
  if (current.length > sectionPrefix.length || chunks.length === 0) {
    chunks.push(current.join("\n"));
  }
  return chunks;
}

function assertFits(lines, indivisibleLines, maxBytes) {
  for (const line of indivisibleLines) assertLineFits(line, maxBytes);
  if (bodyBytes(lines) > maxBytes) {
    throw new Error(`Review comment prefix and indivisible content exceed ${maxBytes} bytes`);
  }
}

function assertLineFits(line, maxBytes) {
  if (Buffer.byteLength(`${line}\n`, "utf8") > maxBytes) {
    throw new Error(`Review comment contains an indivisible line exceeding ${maxBytes} bytes`);
  }
}

function endsWithLines(lines, suffix) {
  if (suffix.length > lines.length) return false;
  return suffix.every((line, index) => line === lines[lines.length - suffix.length + index]);
}

function bodyBytes(lines) {
  return Buffer.byteLength(lines.join("\n"), "utf8");
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableDelimiter(line) {
  if (!isTableRow(line)) return false;
  const cells = line.trim().slice(1, -1).split("|");
  return cells.length > 0 && cells.every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell));
}

function trimTrailingBlankLines(lines) {
  while (lines.length > 0 && lines.at(-1) === "") lines.pop();
}
