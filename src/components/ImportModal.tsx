import {
  Box,
  Button,
  Center,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalProps,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FC, useEffect, useRef, useState } from "react";
import { useNounState } from "../state/nounState";
import { clearCanvas, drawCanvas, replaceCanvas } from "../utils/canvas";
import { checkerboardBg, NounPart } from "../utils/constants";
import { PartImporter } from "./PartImporter";
import { PixelArtCanvas } from "./PixelArtCanvas";

export type ImportModalProps = {
  part: NounPart;
} & Omit<ModalProps, "children">;

export const ImportModal: FC<ImportModalProps> = ({ part, onClose, ...props }) => {
  const partState = useNounState((state) => state[part]);

  return (
    <Modal {...props} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent h="80%" color="gray.100" bgColor="gray.800" borderRadius={0}>
        <ModalHeader fontSize={16}>{`Import ${part}`}</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflow="clip">
          <PartImporter
            canFinishIfPaletteConforms={true}
            finishText="Import"
            finishAction={(canvas) => {
              replaceCanvas(canvas, partState.canvas);
              partState.commit();
              onClose();
            }}
          />
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" borderRadius={0} onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// Hook
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [updated, setUpdated] = useState(false);
  useEffect(() => {
    setUpdated(true);
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setUpdated(false);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return [debouncedValue, updated];
};
